import { Inject, Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';

import {
  AbuseIPDBResponse,
  IpApiResponse,
  ProxyCheckResponse,
  ThreatReport,
} from './interfaces/threat-responses.interface';

@Injectable()
export class ThreatService {
  private readonly logger = new Logger(ThreatService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  // --- WRAPPER 1: AbuseIPDB ---
  private async checkAbuseIPDB(ip: string): Promise<AbuseIPDBResponse> {
    const apiKey = this.configService.get<string>('ABUSEIPDB_API_KEY') || '';

    try {
      const response = await firstValueFrom(
        this.httpService.get<AbuseIPDBResponse>(
          `https://api.abuseipdb.com/api/v2/check`,
          {
            params: { ipAddress: ip, maxAgeInDays: 30 },
            headers: {
              Key: apiKey,
              Accept: 'application/json',
            },
          },
        ),
      );
      return response.data;
    } catch (error: unknown) {
      this.logger.error(
        `Error en AbuseIPDB para ${ip}: ${error instanceof Error ? error.message : 'Desconocido'}`,
      );
      return { data: { abuseConfidenceScore: 0, isPublic: true } };
    }
  }

  private async checkGeolocation(ip: string): Promise<IpApiResponse> {
    try {
      const response = await firstValueFrom(
        this.httpService.get<IpApiResponse>(`http://ip-api.com/json/${ip}`),
      );
      return response.data;
    } catch (error: unknown) {
      this.logger.error(
        `Error en IP-API para ${ip}: ${error instanceof Error ? error.message : 'Desconocido'}`,
      );
      return {
        status: 'fail',
        country: 'Unknown',
        city: 'Unknown',
        isp: 'Unknown',
      };
    }
  }
  private async checkProxy(ip: string): Promise<ProxyCheckResponse> {
    try {
      const response = await firstValueFrom(
        this.httpService.get<ProxyCheckResponse>(
          `http://proxycheck.io/v2/${ip}`,
          {
            params: { vpn: 1, asn: 1 },
          },
        ),
      );
      return response.data;
    } catch (error: unknown) {
      this.logger.error(
        `Error en ProxyCheck para ${ip}: ${error instanceof Error ? error.message : 'Desconocido'}`,
      );
      return {
        status: 'error',
        details: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private calculateRiskScore(
    abuseData: AbuseIPDBResponse,
    geoData: IpApiResponse,
    proxyData: ProxyCheckResponse,
    ip: string,
  ): number {
    let score = 0;

    if (abuseData && abuseData.data) {
      score += abuseData.data.abuseConfidenceScore;
    }

    const proxyInfo = proxyData[ip];

    if (
      proxyInfo &&
      typeof proxyInfo === 'object' &&
      proxyInfo.proxy === 'yes'
    ) {
      if (proxyInfo.type === 'TOR') {
        score += 50;
      } else {
        score += 20;
      }
    }

    if (geoData && geoData.isp) {
      const ispLower = geoData.isp.toLowerCase();
      const hostingKeywords = [
        'amazon',
        'aws',
        'google cloud',
        'digitalocean',
        'ovh',
        'hetzner',
        'linode',
      ];

      const isHosting = hostingKeywords.some((keyword) =>
        ispLower.includes(keyword),
      );
      if (isHosting) {
        score += 15;
      }
    }

    return Math.min(score, 100);
  }

  private determineRiskLevel(score: number): string {
    if (score <= 20) return 'Low';
    if (score <= 50) return 'Medium';
    if (score <= 80) return 'High';
    return 'Critical';
  }

  async analyzeIp(ip: string) {
    // Namespaced key
    const cacheKey = `threat_report:ip:${ip}`;

    const cachedReport = await this.cacheManager.get<ThreatReport>(cacheKey);

    if (cachedReport) {
      this.logger.log(`Reporte entregado desde la RAM para ${ip}`);
      return {
        ...cachedReport,
        source: 'cache',
        executionTimeMs: 0,
      };
    }

    this.logger.log(`Iniciando análisis de red para ${ip}`);
    const startTime = Date.now();

    const [abuseData, geoData, proxyData] = await Promise.all([
      this.checkAbuseIPDB(ip),
      this.checkGeolocation(ip),
      this.checkProxy(ip),
    ]);

    const executionTime = Date.now() - startTime;

    const riskScore = this.calculateRiskScore(
      abuseData,
      geoData,
      proxyData,
      ip,
    );
    const riskLevel = this.determineRiskLevel(riskScore);
    const proxyInfo = proxyData[ip];
    const isProxyOrVPN =
      proxyInfo && typeof proxyInfo === 'object'
        ? proxyInfo.proxy === 'yes'
        : false;
    const finalReport: ThreatReport = {
      ip,
      riskScore,
      riskLevel,
      isProxyOrVPN,
      raw_data: {
        abuse: abuseData,
        geolocation: geoData,
        proxy: proxyData,
      },
    };

    if (geoData.status !== 'fail') {
      await this.cacheManager.set(cacheKey, finalReport);
      this.logger.log(`Reporte guardado en caché para ${ip}`);
    } else {
      this.logger.warn(
        `Evitando envenenamiento de caché: Datos incompletos para ${ip}`,
      );
    }

    return {
      ...finalReport,
      source: 'network',
      executionTimeMs: executionTime,
    };
  }
}
