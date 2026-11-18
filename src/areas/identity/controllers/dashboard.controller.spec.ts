import { Test, TestingModule } from '@nestjs/testing';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from '../services/dashboard.service';

describe('DashboardController (Unit Tests)', () => {
  let controller: DashboardController;
  let service: jest.Mocked<Partial<DashboardService>>;

  beforeEach(async () => {
    service = {
      getConsumerDashboardData: jest.fn().mockResolvedValue({
        profile: { allergies: ['Peanut'] },
        recentProducts: [],
      } as any),
      getManufacturerDashboardData: jest.fn().mockResolvedValue({
        products: [],
        totalProducts: 0,
        documentStats: { total: 0, approved: 0, pending: 0, rejected: 0 },
        hasApprovedDocument: false,
        licence: null,
      } as any),
      getInspectorDashboardData: jest.fn().mockResolvedValue({
        stats: { total: 5, approved: 3, pending: 2, rejected: 0, expiringSoon: 0 },
        pendingDocuments: [],
        recentDecisions: [],
        sampleLicences: [],
      } as any),
      getAdminDashboardData: jest.fn().mockResolvedValue({
        users: [],
        totalUsers: 4,
        roleBreakdown: { consumer: 1, manufacturer: 1, inspector: 1, admin: 1 },
        userTypesCount: 4,
        userTypes: [],
        totalProducts: 10,
        docStats: { total: 5 },
      } as any),
      createAdminUser: jest.fn().mockResolvedValue({ id: 10, name: 'New' } as any),
      updateAdminUser: jest.fn().mockResolvedValue({ id: 10, name: 'Updated' } as any),
      deleteAdminUser: jest.fn().mockResolvedValue({ success: true } as any),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DashboardController],
      providers: [
        {
          provide: DashboardService,
          useValue: service,
        },
      ],
    }).compile();

    controller = module.get<DashboardController>(DashboardController);
  });

  describe('getDashboard (Dispatcher)', () => {
    it('should redirect consumer to /dashboard/consumer', async () => {
      const mockReq = { session: { user: { role: 'consumer' } } } as any;
      const mockRes = { redirect: jest.fn() } as any;

      await controller.getDashboard(mockReq, mockRes);
      expect(mockRes.redirect).toHaveBeenCalledWith('/dashboard/consumer');
    });

    it('should redirect manufacturer to /dashboard/manufacturer', async () => {
      const mockReq = { session: { user: { role: 'manufacturer' } } } as any;
      const mockRes = { redirect: jest.fn() } as any;

      await controller.getDashboard(mockReq, mockRes);
      expect(mockRes.redirect).toHaveBeenCalledWith('/dashboard/manufacturer');
    });

    it('should redirect inspector to /dashboard/inspector', async () => {
      const mockReq = { session: { user: { role: 'inspector' } } } as any;
      const mockRes = { redirect: jest.fn() } as any;

      await controller.getDashboard(mockReq, mockRes);
      expect(mockRes.redirect).toHaveBeenCalledWith('/dashboard/inspector');
    });

    it('should redirect admin to /dashboard/admin', async () => {
      const mockReq = { session: { user: { role: 'admin' } } } as any;
      const mockRes = { redirect: jest.fn() } as any;

      await controller.getDashboard(mockReq, mockRes);
      expect(mockRes.redirect).toHaveBeenCalledWith('/dashboard/admin');
    });
  });

  describe('getConsumerDashboard', () => {
    it('should render consumer dashboard with health profile', async () => {
      const mockReq = { session: { user: { id: 1, name: 'Alice', role: 'consumer' } } } as any;
      const result = await controller.getConsumerDashboard(mockReq);

      expect(result.title).toContain('Consumer');
      expect(result.profile).toBeDefined();
      expect(service.getConsumerDashboardData).toHaveBeenCalledWith(1);
    });
  });

  describe('getManufacturerDashboard', () => {
    it('should render manufacturer dashboard with compliance and products', async () => {
      const mockReq = {
        session: { user: { id: 2, name: 'Oatly', role: 'manufacturer' } },
      } as any;
      const result = await controller.getManufacturerDashboard(mockReq);

      expect(result.title).toContain('Manufacturer');
      expect(service.getManufacturerDashboardData).toHaveBeenCalled();
    });
  });

  describe('getInspectorDashboard', () => {
    it('should render inspector dashboard with audit queue and metrics', async () => {
      const mockReq = {
        session: { user: { id: 3, name: 'Inspector Vance', role: 'inspector' } },
      } as any;
      const result = await controller.getInspectorDashboard(mockReq);

      expect(result.title).toContain('Inspector');
      expect(service.getInspectorDashboardData).toHaveBeenCalled();
    });
  });

  describe('getAdminDashboard', () => {
    it('should render admin dashboard with user breakdown and platform vitals', async () => {
      const mockReq = {
        session: { user: { id: 4, name: 'Root Admin', role: 'admin' } },
      } as any;
      const result = await controller.getAdminDashboard(mockReq);

      expect(result.title).toContain('Admin');
      expect(result.totalUsers).toBe(4);
      expect(service.getAdminDashboardData).toHaveBeenCalled();
    });

    it('should pass pagination, sorting and filter queries to service', async () => {
      const mockReq = {
        session: { user: { id: 4, name: 'Root Admin', role: 'admin' } },
      } as any;
      const result = await controller.getAdminDashboard(
        mockReq,
        '2',
        '15',
        'name',
        'ASC',
        'consumer',
        'john',
        'Success message',
      );

      expect(service.getAdminDashboardData).toHaveBeenCalledWith({
        page: 2,
        limit: 15,
        sort: 'name',
        order: 'ASC',
        role: 'consumer',
        search: 'john',
      });
      expect(result.success).toBe('Success message');
    });
  });

  describe('createAdminUser', () => {
    it('should create user and redirect with success message', async () => {
      const mockRes = { redirect: jest.fn() } as any;
      await controller.createAdminUser(
        {
          name: 'Jane Inspector',
          email: 'jane@inspection.gov',
          role: 'inspector',
          password: 'password123',
          isVerified: 'on',
        },
        mockRes,
      );

      expect(service.createAdminUser).toHaveBeenCalledWith({
        name: 'Jane Inspector',
        email: 'jane@inspection.gov',
        role: 'inspector',
        password: 'password123',
        isVerified: true,
      });
      expect(mockRes.redirect).toHaveBeenCalledWith(
        expect.stringContaining('/dashboard/admin?success='),
      );
    });

    it('should redirect with error message when creation throws', async () => {
      const mockRes = { redirect: jest.fn() } as any;
      (service.createAdminUser as jest.Mock).mockRejectedValueOnce(
        new Error('Account already exists'),
      );

      await controller.createAdminUser(
        {
          name: 'Duplicate',
          email: 'dup@test.com',
          role: 'consumer',
        },
        mockRes,
      );

      expect(mockRes.redirect).toHaveBeenCalledWith(
        expect.stringContaining('/dashboard/admin?error='),
      );
    });
  });

  describe('updateAdminUser', () => {
    it('should update user and redirect with success message', async () => {
      const mockRes = { redirect: jest.fn() } as any;
      await controller.updateAdminUser(
        5,
        {
          name: 'Updated Name',
          email: 'updated@test.com',
          role: 'manufacturer',
          isVerified: 'on',
          _hasVerifiedField: 'true',
        },
        mockRes,
      );

      expect(service.updateAdminUser).toHaveBeenCalledWith(5, {
        name: 'Updated Name',
        email: 'updated@test.com',
        role: 'manufacturer',
        password: undefined,
        isVerified: true,
      });
      expect(mockRes.redirect).toHaveBeenCalledWith(
        expect.stringContaining('/dashboard/admin?success='),
      );
    });

    it('should redirect with error message when update throws', async () => {
      const mockRes = { redirect: jest.fn() } as any;
      (service.updateAdminUser as jest.Mock).mockRejectedValueOnce(
        new Error('User not found'),
      );

      await controller.updateAdminUser(999, { name: 'None' }, mockRes);

      expect(mockRes.redirect).toHaveBeenCalledWith(
        expect.stringContaining('/dashboard/admin?error='),
      );
    });
  });

  describe('deleteAdminUser', () => {
    it('should delete user and redirect with success message', async () => {
      const mockReq = { session: { user: { id: 4 } } } as any;
      const mockRes = { redirect: jest.fn() } as any;

      await controller.deleteAdminUser(7, mockReq, mockRes);

      expect(service.deleteAdminUser).toHaveBeenCalledWith(7, 4);
      expect(mockRes.redirect).toHaveBeenCalledWith(
        expect.stringContaining('/dashboard/admin?success='),
      );
    });

    it('should redirect with error message when deletion fails', async () => {
      const mockReq = { session: { user: { id: 4 } } } as any;
      const mockRes = { redirect: jest.fn() } as any;
      (service.deleteAdminUser as jest.Mock).mockRejectedValueOnce(
        new Error('Cannot delete own account'),
      );

      await controller.deleteAdminUser(4, mockReq, mockRes);

      expect(mockRes.redirect).toHaveBeenCalledWith(
        expect.stringContaining('/dashboard/admin?error='),
      );
    });
  });
});
