import type { ISignedUser } from '@hsm/common/interfaces';
import { Test, TestingModule } from '@nestjs/testing';
import type { Request } from 'express';
import { DocsController } from './docs.controller';
import { DocsService } from './docs.service';

const docsService = {
  listDocuments: jest
    .fn()
    .mockResolvedValue({ data: [], total: 0, page: 1, limit: 20 }),
  generateDocument: jest
    .fn()
    .mockResolvedValue({ documentId: 'doc-uuid', jobId: 'job-id' }),
  getDocument: jest.fn().mockResolvedValue({ id: 'doc-uuid', title: 'Test' }),
  getDocumentUrl: jest
    .fn()
    .mockResolvedValue({ url: 'https://s3.example.com/file' }),
  deleteDocument: jest.fn().mockResolvedValue({ deleted: true }),
  getDocumentsUrl: jest.fn().mockResolvedValue([]),
  uploadDocuments: jest.fn().mockResolvedValue([]),
};

const signedUser: ISignedUser = {
  id: 'user-uuid',
  username: 'jdoe',
  email: 'jdoe@test.com',
  firstName: 'John',
  firstLastName: 'Doe',
  roles: [],
  iat: 0,
  exp: 9999,
};

const makeReq = (user: ISignedUser | undefined = signedUser): Request =>
  ({ user }) as unknown as Request;

describe('DocsController', () => {
  let controller: DocsController;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DocsController],
      providers: [{ provide: DocsService, useValue: docsService }],
    }).compile();

    controller = module.get<DocsController>(DocsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('listDocuments', () => {
    it('delegates query and user id to docsService.listDocuments', async () => {
      const query = { page: 1, limit: 10 } as never;
      const result = await controller.listDocuments(query, makeReq());
      expect(docsService.listDocuments).toHaveBeenCalledWith(query, 'user-uuid');
      expect(result).toEqual({ data: [], total: 0, page: 1, limit: 20 });
    });
  });

  describe('generateDocument', () => {
    it('delegates dto and user id to docsService.generateDocument', async () => {
      const dto = {
        templateIdentifier: 'hcu_001',
        data: {},
        title: 'HCU',
      } as never;
      const result = await controller.generateDocument(dto, makeReq());
      expect(docsService.generateDocument).toHaveBeenCalledWith(
        dto,
        'user-uuid',
      );
      expect(result).toEqual({ documentId: 'doc-uuid', jobId: 'job-id' });
    });
  });

  describe('getDocument', () => {
    it('delegates id and user id to docsService.getDocument', async () => {
      const result = await controller.getDocument('doc-uuid', makeReq());
      expect(docsService.getDocument).toHaveBeenCalledWith(
        'doc-uuid',
        'user-uuid',
      );
      expect(result).toMatchObject({ id: 'doc-uuid' });
    });
  });

  describe('getDocumentUrl', () => {
    it('delegates id and user id to docsService.getDocumentUrl', async () => {
      const result = await controller.getDocumentUrl('doc-uuid', makeReq());
      expect(docsService.getDocumentUrl).toHaveBeenCalledWith(
        'doc-uuid',
        'user-uuid',
      );
      expect(result).toEqual({ url: 'https://s3.example.com/file' });
    });
  });

  describe('deleteDocument', () => {
    it('delegates id and user id to docsService.deleteDocument', async () => {
      const result = await controller.deleteDocument('doc-uuid', makeReq());
      expect(docsService.deleteDocument).toHaveBeenCalledWith(
        'doc-uuid',
        'user-uuid',
      );
      expect(result).toEqual({ deleted: true });
    });
  });

  describe('getDocumentsUrl', () => {
    it('delegates payload and options to docsService.getDocumentsUrl', async () => {
      const payload = { ids: ['doc-uuid'] } as never;
      await controller.getDocumentsUrl(payload, 'inline', 60);
      expect(docsService.getDocumentsUrl).toHaveBeenCalledWith(payload, {
        contentDisposition: 'inline',
        expiresInSeconds: 60,
      });
    });
  });

  describe('uploadDocuments', () => {
    it('delegates body, files, and user id to docsService.uploadDocuments', async () => {
      const body = { payload: [] } as never;
      const files: Express.Multer.File[] = [];
      await controller.uploadDocuments(body, files, makeReq());
      expect(docsService.uploadDocuments).toHaveBeenCalledWith(
        body,
        files,
        'user-uuid',
      );
    });
  });
});
