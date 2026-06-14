import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, type AuthUser } from '../auth/current-user.decorator';
import { FinanceService } from './finance.service';
import { LedgerQueryDto } from './dto/ledger-query.dto';

@ApiTags('Finance')
@ApiBearerAuth()
@Controller('tontines')
@UseGuards(JwtAuthGuard)
export class FinanceController {
  constructor(private readonly financeService: FinanceService) {}

  @Get(':id/funds')
  @ApiOperation({ summary: 'Soldes des caisses de la tontine (membres)' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({
    status: 200,
    description: 'Liste des caisses avec leur solde',
  })
  @ApiResponse({ status: 403, description: 'Non membre de la tontine' })
  getFunds(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.financeService.getFunds(id, user.userId);
  }

  @Get(':id/ledger')
  @ApiOperation({
    summary: 'Historique des transactions du Ledger (paginé, membres)',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Transactions paginées' })
  @ApiResponse({ status: 403, description: 'Non membre de la tontine' })
  getLedger(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: LedgerQueryDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.financeService.getLedger(id, user.userId, query);
  }

  @Get(':id/contributions')
  @ApiOperation({ summary: 'Cotisations de la tontine (membres)' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({
    status: 200,
    description: 'Transactions de type CONTRIBUTION',
  })
  @ApiResponse({ status: 403, description: 'Non membre de la tontine' })
  getContributions(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.financeService.getContributions(id, user.userId);
  }
}
