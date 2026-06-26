import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export class CreateRatingDto {
  tripId: string;
  score: number;
  comment?: string;
}

@Injectable()
export class RatingsService {
  constructor(private prisma: PrismaService) {}

  async createRating(raterId: string, dto: CreateRatingDto) {
    if (dto.score < 1 || dto.score > 5) throw new BadRequestException('Score must be 1-5');

    const trip = await this.prisma.trip.findUnique({
      where: { id: dto.tripId },
      include: { driver: true },
    });

    if (!trip || trip.status !== 'COMPLETED') {
      throw new BadRequestException('Can only rate completed trips');
    }

    const isPassenger = trip.passengerId === raterId;
    const ratedId = isPassenger ? trip.driver?.userId : trip.passengerId;

    if (!ratedId) throw new NotFoundException('Rated user not found');

    const rating = await this.prisma.rating.create({
      data: { tripId: dto.tripId, raterId, ratedId, score: dto.score, comment: dto.comment },
    });

    if (isPassenger && trip.driver) {
      const driverRatings = await this.prisma.rating.aggregate({
        where: { rated: { driver: { id: trip.driver.id } } },
        _avg: { score: true },
      });
      await this.prisma.driver.update({
        where: { id: trip.driver.id },
        data: { rating: driverRatings._avg.score ?? 5 },
      });
    }

    return rating;
  }
}
