import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';
import session = require('express-session');
import hbs = require('hbs');
import { AppModule } from './app.module';
import { AuthExceptionFilter } from './common/filters/auth-exception.filter';
import { CsrfGuard } from './common/guards/csrf.guard';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Trust reverse proxy (Railway, Render, Fly.io, Cloudflare) for HTTPS secure cookies
  app.set('trust proxy', 1);

  // Serve static assets (CSS, images, client scripts)
  app.useStaticAssets(join(__dirname, '..', 'public'));

  // Base views directory: src
  app.setBaseViewsDir(join(__dirname, '..', 'src'));
  app.setViewEngine('hbs');

  // Synchronously register partials so they are guaranteed ready before requests arrive
  const partialsDir = join(__dirname, '..', 'src', 'shared', 'views', 'partials');
  if (fs.existsSync(partialsDir)) {
    const filenames = fs.readdirSync(partialsDir);
    filenames.forEach((filename) => {
      if (filename.endsWith('.hbs')) {
        const matches = /^([^.]+)\.hbs$/.exec(filename);
        if (!matches) return;
        const name = matches[1];
        const template = fs.readFileSync(join(partialsDir, filename), 'utf8');
        hbs.registerPartial(name, template);
        // Also register without leading underscore if named with underscore
        if (name.startsWith('_')) {
          hbs.registerPartial(name.substring(1), template);
        }
      }
    });
  }

  // Also call hbs built-in registerPartials for folder watching
  hbs.registerPartials(partialsDir);

  app.set('view options', {
    layout: 'shared/views/layouts/main',
  });

  // Handlebars Template Helpers
  hbs.registerHelper('eq', (a, b) => a === b);
  hbs.registerHelper('ne', (a, b) => a !== b);
  hbs.registerHelper('or', (a, b) => a || b);
  hbs.registerHelper('and', (a, b) => a && b);
  hbs.registerHelper('gte', (a, b) => a >= b);
  hbs.registerHelper('lte', (a, b) => a <= b);
  hbs.registerHelper('gt', (a, b) => a > b);
  hbs.registerHelper('lt', (a, b) => a < b);
  hbs.registerHelper('add', (a, b) => Number(a) + Number(b));
  hbs.registerHelper('subtract', (a, b) => Number(a) - Number(b));
  hbs.registerHelper('urlEncode', (val: any) => encodeURIComponent(String(val || '')));
  hbs.registerHelper('includes', (arr: any, val: any) => {
    if (!arr) return false;
    if (Array.isArray(arr)) {
      return arr.some((item) => String(item).toLowerCase() === String(val).toLowerCase());
    }
    if (typeof arr === 'string') {
      return arr.toLowerCase().includes(String(val).toLowerCase());
    }
    return false;
  });

  // Session & Security Hardening
  const isProduction = process.env.NODE_ENV === 'production';
  const sessionSecret = process.env.SESSION_SECRET;
  if (!sessionSecret && isProduction) {
    throw new Error('FATAL: SESSION_SECRET environment variable is required in production.');
  }

  // Session Middleware
  app.use(
    session({
      secret: sessionSecret || 'truelabel_super_secret_session_key_2026',
      resave: false,
      saveUninitialized: false,
      proxy: true, // Required for secure cookies behind reverse proxies (Railway, Render, etc.)
      cookie: {
        maxAge: 24 * 60 * 60 * 1000,
        httpOnly: true,
        sameSite: 'lax',
        secure: isProduction,
      },
    }),
  );

  // CSRF token generation and template exposure middleware
  app.use((req: any, res: any, next: any) => {
    if (req.session) {
      if (!req.session.csrfToken) {
        req.session.csrfToken = crypto.randomBytes(32).toString('hex');
      }
      res.locals.csrfToken = req.session.csrfToken;
    }
    res.locals.enableDemoSwitcher =
      process.env.NODE_ENV !== 'production' || process.env.ENABLE_DEMO_SWITCHER === 'true';
    next();
  });

  // Global Guards & Exception Filters
  app.useGlobalGuards(new CsrfGuard());
  app.useGlobalFilters(new AuthExceptionFilter());


  const port = process.env.PORT || 3000;
  await app.listen(port);
  const dbUrl = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;
  if (dbUrl) {
    console.log('[Database] Single Source of Truth: PostgreSQL (Supabase) connected and active.');
  } else {
    console.log('[Database] Warning: No DATABASE_URL found. Running with local fallback.');
  }
  console.log(`TrueLabel platform is running live at: http://localhost:${port}/`);
}

bootstrap();
