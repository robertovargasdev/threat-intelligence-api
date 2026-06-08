import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiTags, ApiResponse, ApiParam } from '@nestjs/swagger';
import { ThreatService } from './threat.service';
import { ThreatResponseDto } from './dto/threat-response.dto';

@ApiTags('Threat Intelligence')
@Controller('threat')
export class ThreatController {
  constructor(private readonly threatService: ThreatService) {}

  @Get(':ip')
  @ApiOperation({ summary: 'Analiza el nivel de riesgo de una dirección IP' })
  @ApiParam({
    name: 'ip',
    example: '8.8.8.8',
    description: 'Dirección IPv4 o IPv6',
  })
  @ApiResponse({
    status: 200,
    description: 'Análisis completado exitosamente',
    type: ThreatResponseDto,
  })
  async analyze(@Param('ip') ip: string) {
    return await this.threatService.analyzeIp(ip);
  }
}
