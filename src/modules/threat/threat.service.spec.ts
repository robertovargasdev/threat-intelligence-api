import { Test, TestingModule } from '@nestjs/testing';
import { ThreatService } from './threat.service';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import { of } from 'rxjs';

describe('ThreatService', () => {
  let service: ThreatService;
  let httpService: HttpService;
  let cacheManager: Cache;

  beforeEach(async () => {
    const mockHttpService = {
      get: jest.fn(),
    };
    const mockConfigService = {
      get: jest.fn().mockReturnValue('api_key_falsa'),
    };
    const mockCacheManager = {
      get: jest.fn(),
      set: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ThreatService,
        { provide: HttpService, useValue: mockHttpService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: CACHE_MANAGER, useValue: mockCacheManager },
      ],
    }).compile();

    service = module.get<ThreatService>(ThreatService);
    httpService = module.get<HttpService>(HttpService);
    cacheManager = module.get<Cache>(CACHE_MANAGER);
  });

  it('debería estar definido', () => {
    expect(service).toBeDefined();
  });

  it('debería hacer peticiones HTTP si la caché está vacía (Cache Miss)', async () => {
    const fakeIp = '1.1.1.1';

    // 1. FORZAMOS EL CACHE MISS: La caché dice "No tengo este dato"
    const cacheGetSpy = jest.spyOn(cacheManager, 'get').mockResolvedValue(null);
    const cacheSetSpy = jest
      .spyOn(cacheManager, 'set')
      .mockResolvedValue(undefined);

    // 2. SIMULAMOS LA RED (El poder de mockImplementation)
    // Usamos 'mockImplementation' para responder diferente dependiendo de a qué URL llame tu Promise.all
    const httpGetSpy = jest
      .spyOn(httpService, 'get')
      .mockImplementation((url: string) => {
        if (url.includes('abuseipdb')) {
          return of({
            data: { data: { abuseConfidenceScore: 75, isPublic: true } },
          } as any);
        }
        if (url.includes('ip-api')) {
          return of({ data: { status: 'success', isp: 'Amazon AWS' } } as any);
        }
        if (url.includes('proxycheck')) {
          return of({
            data: { status: 'ok', [fakeIp]: { proxy: 'yes', type: 'VPN' } },
          } as any);
        }
        return of({ data: {} } as any);
      });

    // 3. EJECUTAMOS LA ACCIÓN
    const result = await service.analyzeIp(fakeIp);

    // 4. VERIFICAMOS EL MOTOR DE DECISIÓN
    expect(cacheGetSpy).toHaveBeenCalledWith(`threat_report:ip:${fakeIp}`);
    expect(httpGetSpy).toHaveBeenCalledTimes(3); // ¡Comprueba que se disparó el Promise.all!
    expect(cacheSetSpy).toHaveBeenCalled(); // ¡Comprueba que guardó el resultado en caché!

    // Verificamos si tu matemática de Riesgo funciona:
    // 75 (AbuseIPDB) + 15 (ISP Amazon) + 20 (Proxy VPN) = 110 -> Math.min(110, 100) = 100
    expect(result.source).toBe('network');
    expect(result.riskScore).toBe(100);
    expect(result.riskLevel).toBe('Critical');
  });
});
