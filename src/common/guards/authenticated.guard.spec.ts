import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthenticatedGuard } from './authenticated.guard';

describe('AuthenticatedGuard', () => {
  let guard: AuthenticatedGuard;

  beforeEach(() => {
    guard = new AuthenticatedGuard();
  });

  it('should allow access if session contains a valid user', () => {
    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => ({
          session: {
            user: { id: 1, role: 'consumer', email: 'consumer@truelabel.demo' },
          },
        }),
      }),
    } as unknown as ExecutionContext;

    expect(guard.canActivate(mockContext)).toBe(true);
  });

  it('should throw UnauthorizedException if session is missing', () => {
    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => ({}),
      }),
    } as unknown as ExecutionContext;

    expect(() => guard.canActivate(mockContext)).toThrow(UnauthorizedException);
  });

  it('should throw UnauthorizedException if session.user is null', () => {
    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => ({
          session: { user: null },
        }),
      }),
    } as unknown as ExecutionContext;

    expect(() => guard.canActivate(mockContext)).toThrow(UnauthorizedException);
  });
});
