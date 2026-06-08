export interface AbuseIPDBResponse {
  data: { abuseConfidenceScore: number; isPublic: boolean };
}

export interface IpApiResponse {
  status: string;
  country: string;
  city: string;
  isp: string;
}

export interface ProxyInfo {
  proxy: string;
  type?: string;
  provider?: string;
  asn?: string;
  country?: string;
}

export interface ProxyCheckResponse {
  status: string;
  [key: string]: string | ProxyInfo | undefined;
}

export interface ThreatReport {
  ip: string;
  riskScore: number;
  riskLevel: string;
  isProxyOrVPN: boolean;
  raw_data: {
    abuse: AbuseIPDBResponse;
    geolocation: IpApiResponse;
    proxy: ProxyCheckResponse;
  };
}
