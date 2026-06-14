import { OrganizationsService } from './organizations.service';

describe('OrganizationsService', () => {
  it('crée une organisation avec son nom', async () => {
    const repo = {
      create: jest.fn((v: unknown) => v),
      save: jest.fn(async (v: any) => ({ id: 'org-uuid', ...v })),
    };
    const service = new OrganizationsService(repo as any);

    const res = await service.create({ name: 'Tontine des Amis' });

    expect(repo.create).toHaveBeenCalledWith({ name: 'Tontine des Amis' });
    expect(res).toEqual({ id: 'org-uuid', name: 'Tontine des Amis' });
  });
});
