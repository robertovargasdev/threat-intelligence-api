import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('Health Check')
@Controller()
export class HealthController {
  @Get()
  @ApiOperation({
    summary: 'Verifica si la API está en línea (Para balanceadores de carga)',
  })
  checkHealth() {
    return {
      status: 'API Online',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }
}
