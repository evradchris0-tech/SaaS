import { Injectable, BadRequestException } from '@nestjs/common';
import { TontineType } from '../../../common/enums';
import { TontineStrategy } from './tontine-strategy.interface';
import { RotatingStrategy } from './rotating.strategy';
import { AuctionStrategy } from './auction.strategy';

@Injectable()
export class TontineStrategyFactory {
  getStrategy(type: TontineType): TontineStrategy {
    switch (type) {
      case TontineType.ROTATING:
        return new RotatingStrategy();
      case TontineType.AUCTION:
        return new AuctionStrategy();
      default:
        throw new BadRequestException(
          `Stratégie non implémentée pour le type: ${type}`,
        );
    }
  }
}
