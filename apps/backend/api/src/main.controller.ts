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

  /**
   * Public version endpoint for the UI footer. Returns ONLY the semantic
   * version (no git SHA / branch / build timestamp) so anonymous callers get
   * no exact-build reconnaissance.
   */
  @ApiDocumentation()
  @Public()
  @Get('version')
  version(): { version: string } {
    return this.mainService.getVersion();
  }
}
