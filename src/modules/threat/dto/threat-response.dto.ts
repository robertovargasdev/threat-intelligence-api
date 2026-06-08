import { ApiProperty } from '@nestjs/swagger';

export class ThreatResponseDto {
  @ApiProperty({
    example: '8.8.8.8',
    description: 'La dirección IP pública analizada',
  })
  ip!: string;

  @ApiProperty({
    example: 85,
    description:
      'Puntaje de riesgo normalizado del 0 (Seguro) al 100 (Crítico)',
  })
  riskScore!: number;

  @ApiProperty({
    example: 'High',
    enum: ['Low', 'Medium', 'High', 'Critical'],
    description: 'Nivel de riesgo humanizado',
  })
  riskLevel!: string;

  @ApiProperty({
    example: true,
    description:
      'Bandera que indica si la IP pertenece a un Proxy, VPN o red TOR',
  })
  isProxyOrVPN!: boolean;

  @ApiProperty({
    description:
      'Datos crudos obtenidos de las agencias de inteligencia (AbuseIPDB, IP-API, ProxyCheck)',
    type: 'object',
    additionalProperties: true,
  })
  raw_data!: Record<string, any>;
}
