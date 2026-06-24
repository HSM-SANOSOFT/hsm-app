import { SettingsAccessorService } from '@hsm/database/settings';
import { Test, TestingModule } from '@nestjs/testing';
import nodemailer from 'nodemailer';
import { SmtpTransportProvider } from './smtp-transport.provider';

jest.mock('nodemailer');

describe('SmtpTransportProvider', () => {
  let provider: SmtpTransportProvider;
  let accessor: {
    getVersionHash: jest.Mock;
    getCategoryValues: jest.Mock;
  };
  let createTransport: jest.Mock;

  beforeEach(async () => {
    jest.clearAllMocks();

    createTransport = nodemailer.createTransport as unknown as jest.Mock;
    createTransport.mockImplementation((cfg: unknown) => ({ __cfg: cfg }));

    accessor = {
      getVersionHash: jest.fn(),
      getCategoryValues: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SmtpTransportProvider,
        { provide: SettingsAccessorService, useValue: accessor },
      ],
    }).compile();

    provider = module.get(SmtpTransportProvider);
  });

  it('builds the transport from current effective SMTP settings', async () => {
    accessor.getVersionHash.mockResolvedValue('h1');
    accessor.getCategoryValues.mockResolvedValue({
      SMTP_ADDRESS: 'smtp.host.test',
      SMTP_PORT: '587',
      SMTP_USERNAME: 'user',
      SMTP_PASSWORD: 'pass',
      SMTP_SECURE: 'false',
    });

    await provider.getTransporter();

    expect(createTransport).toHaveBeenCalledWith(
      expect.objectContaining({
        host: 'smtp.host.test',
        port: 587,
        secure: false,
        auth: { user: 'user', pass: 'pass' },
      }),
    );
  });

  it('reuses the transport while the settings hash is unchanged', async () => {
    accessor.getVersionHash.mockResolvedValue('h1');
    accessor.getCategoryValues.mockResolvedValue({
      SMTP_ADDRESS: 'smtp.host.test',
      SMTP_PORT: '587',
    });

    const a = await provider.getTransporter();
    const b = await provider.getTransporter();

    expect(a).toBe(b);
    expect(createTransport).toHaveBeenCalledTimes(1);
  });

  it('rebuilds the transport after an SMTP setting changes (hash changes)', async () => {
    accessor.getVersionHash.mockResolvedValueOnce('h1');
    accessor.getCategoryValues.mockResolvedValueOnce({
      SMTP_ADDRESS: 'old.host.test',
      SMTP_PORT: '587',
    });
    const first = await provider.getTransporter();

    // Setting changed -> new hash -> rebuild on next send.
    accessor.getVersionHash.mockResolvedValueOnce('h2');
    accessor.getCategoryValues.mockResolvedValueOnce({
      SMTP_ADDRESS: 'new.host.test',
      SMTP_PORT: '465',
      SMTP_SECURE: 'true',
    });
    const second = await provider.getTransporter();

    expect(second).not.toBe(first);
    expect(createTransport).toHaveBeenCalledTimes(2);
    expect(createTransport).toHaveBeenLastCalledWith(
      expect.objectContaining({
        host: 'new.host.test',
        port: 465,
        secure: true,
      }),
    );
  });
});
