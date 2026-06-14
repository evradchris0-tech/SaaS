import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { Organization } from './organization.entity';

@Injectable()
export class OrganizationsService {
  constructor(
    @InjectRepository(Organization)
    private readonly organizations: Repository<Organization>,
  ) {}

  create(dto: CreateOrganizationDto): Promise<Organization> {
    return this.organizations.save(
      this.organizations.create({ name: dto.name }),
    );
  }
}
