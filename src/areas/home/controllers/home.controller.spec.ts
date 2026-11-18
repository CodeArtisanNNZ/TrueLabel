import { Test, TestingModule } from '@nestjs/testing';
import { HomeController } from './home.controller';
import { CatalogService } from '../../food-catalog/services/catalog.service';
import { DocumentService } from '../../food-safety/services/document.service';
import { PreferenceService } from '../../personal-food/services/preference.service';

describe('HomeController', () => {
  let controller: HomeController;
  let catalogService: jest.Mocked<Partial<CatalogService>>;
  let documentService: jest.Mocked<Partial<DocumentService>>;
  let preferenceService: jest.Mocked<Partial<PreferenceService>>;

  const mockProduct = {
    id: 1,
    name: 'Organic Oat Milk',
    brand: 'OatField',
    barcode: '8901234567890',
    category: 'Beverages',
    qualityScore: 92,
    ingredients: [],
    nutritionFacts: [],
    status: 'active' as const,
  };

  beforeEach(async () => {
    catalogService = {
      searchAndFilter: jest.fn().mockResolvedValue({
        items: [mockProduct],
        total: 1,
        page: 1,
        totalPages: 1,
      }),
      getFilterOptions: jest.fn().mockResolvedValue({
        categories: ['Beverages', 'Dairy & Plant Milks'],
        dietaryTags: ['Vegan', 'Gluten-Free'],
      }),
      buildDossierSpecimen: jest.fn().mockReturnValue({
        product: mockProduct,
        tierInfo: {
          score: 92,
          tierNumber: 1,
          tierLabel: 'Tier 1 · Superior Transparency',
          badgeLabel: 'Verified High Standard',
          badgeClass: 'score-badge-high',
          textColorClass: 'text-emerald-700 dark:text-emerald-400',
          tierColorClass: 'text-emerald-800 dark:text-emerald-300',
          badgeBgClass: 'bg-emerald-100 text-emerald-800 border-emerald-300',
          isHigh: true,
          isMid: false,
          isLow: false,
        },
        additivesSummary: {
          label: '0 Detected (Clean Label)',
          count: 0,
          status: 'safe',
          badgeClass: 'text-emerald-700 bg-emerald-50',
        },
        allergensSummary: {
          label: '0 Declared (Clean Formulation)',
          count: 0,
          status: 'safe',
          badgeClass: 'text-emerald-700 bg-emerald-50',
        },
        sugarSummary: {
          label: '2.8g / 100ml (Low Density)',
          amount: 2.8,
          status: 'safe',
          colorClass: 'text-emerald-700 font-mono font-bold',
        },
        nationalLicence: 'BSTI-FOOD-2024-001 (Valid)',
        ingredients: [],
      } as any),
    };

    documentService = {
      getStatistics: jest.fn().mockResolvedValue({
        total: 5,
        pending: 1,
        approved: 4,
        rejected: 0,
        expiringSoon: 0,
      }),
      getDocuments: jest.fn().mockResolvedValue([]),
      getSampleLicences: jest.fn().mockResolvedValue([
        { id: 1, licenceNumber: 'BSTI-FOOD-2024-001', status: 'valid' } as any,
      ]),
    };

    preferenceService = {
      findByUserId: jest.fn().mockResolvedValue(null),
      evaluateProductConflict: jest.fn().mockReturnValue(null),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HomeController],
      providers: [
        { provide: CatalogService, useValue: catalogService },
        { provide: DocumentService, useValue: documentService },
        { provide: PreferenceService, useValue: preferenceService },
      ],
    }).compile();

    controller = module.get<HomeController>(HomeController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getHomePage', () => {
    it('should return featured products and stats for guest visitor', async () => {
      const mockReq: any = { session: {} };

      const result = await controller.getHomePage(mockReq);

      expect(result).toBeDefined();
      expect(result.title).toContain('TrueLabel');
      expect(result.activeNav).toBe('home');
      expect(result.featuredProducts).toHaveLength(1);
      expect(result.stats.products).toBe(1);
      expect(result.stats.documents).toBe(5);
      expect(catalogService.searchAndFilter).toHaveBeenCalledWith({ limit: 4 });
      expect(documentService.getStatistics).toHaveBeenCalled();
      expect(preferenceService.findByUserId).not.toHaveBeenCalled();
    });

    it('should annotate featured products with conflict evaluation when user is logged in', async () => {
      const mockUser = { id: 10, email: 'consumer@test.demo', role: 'consumer', name: 'Test Consumer' };
      const mockProfile = { id: 5, userId: 10, allergies: ['Peanut'], dietaryTags: ['Vegan'] };
      const mockConflict = { hasAllergenConflict: false, isSafeForUser: true, profileConfigured: true };

      preferenceService.findByUserId = jest.fn().mockResolvedValue(mockProfile);
      preferenceService.evaluateProductConflict = jest.fn().mockReturnValue(mockConflict);

      const mockReq: any = { session: { user: mockUser } };

      const result = await controller.getHomePage(mockReq);

      expect(preferenceService.findByUserId).toHaveBeenCalledWith(10);
      expect(preferenceService.evaluateProductConflict).toHaveBeenCalledWith(mockProfile, mockProduct);
      expect(result.featuredProducts[0].userConflict).toEqual(mockConflict);
      expect(result.user).toEqual(mockUser);
    });

    it('should query manufacturer documents when manufacturer user is logged in', async () => {
      const mockMfgUser = { id: 2, email: 'manufacturer@test.demo', role: 'manufacturer', name: 'Test Mfg' };
      documentService.getDocuments = jest.fn().mockResolvedValue([{ id: 101 }] as any);

      const mockReq: any = { session: { user: mockMfgUser } };

      const result = await controller.getHomePage(mockReq);

      expect(documentService.getDocuments).toHaveBeenCalledWith({ manufacturerId: 2 });
      expect(result.roleInsights.manufacturerDocsCount).toBe(1);
      expect(result.user).toEqual(mockMfgUser);
    });
  });

  describe('Static & Policy Public Pages', () => {
    const mockReq: any = { session: { user: { id: 1, name: 'Alice' } } };

    it('should render terms page with proper title and activeNav', () => {
      const result = controller.getTermsPage(mockReq);
      expect(result.title).toContain('Terms of Service');
      expect(result.activeNav).toBe('terms');
      expect(result.user).toEqual(mockReq.session.user);
    });

    it('should render privacy policy page with proper title and activeNav', () => {
      const result = controller.getPrivacyPage(mockReq);
      expect(result.title).toContain('Privacy Policy');
      expect(result.activeNav).toBe('privacy');
      expect(result.user).toEqual(mockReq.session.user);
    });

    it('should render cache and cookie policy page with proper title and activeNav', () => {
      const result = controller.getCachePolicyPage(mockReq);
      expect(result.title).toContain('Cache, Cookies');
      expect(result.activeNav).toBe('cache-policy');
      expect(result.user).toEqual(mockReq.session.user);
    });

    it('should render about page with proper title and activeNav', () => {
      const result = controller.getAboutPage(mockReq);
      expect(result.title).toContain('About TrueLabel');
      expect(result.activeNav).toBe('about');
      expect(result.user).toEqual(mockReq.session.user);
    });

    it('should render contact and inquiries page with proper title and activeNav', () => {
      const result = controller.getContactPage(mockReq);
      expect(result.title).toContain('Contact & Regulatory');
      expect(result.activeNav).toBe('contact');
      expect(result.user).toEqual(mockReq.session.user);
    });
  });
});
