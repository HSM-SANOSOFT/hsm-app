import { Controller, Get } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckService,
  HttpHealthIndicator,
} from '@nestjs/terminus';
import { ApiDocumentation, Public } from './decorator';
import { MainService } from './main.service';

@Controller('health')
export class MainController {
  constructor(
    private readonly mainService: MainService,
    private health: HealthCheckService,
    private http: HttpHealthIndicator,
  ) {}

  @ApiDocumentation()
  @Public()
  @Get()
  @HealthCheck()
  check() {
    return this.health.check([]);
  }
}
