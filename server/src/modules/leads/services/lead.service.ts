import { LeadRepository } from '../repositories/lead.repository.js';
import { NewLeadEntity } from '../../../database/schema/leads.js';

export class LeadService {
  private repository = new LeadRepository();

  async listLeads(filters: { search?: string; status?: string; priority?: string; assignee?: string }) {
    return this.repository.findAll(filters);
  }

  async getLeadById(id: string) {
    const lead = await this.repository.findById(id);
    if (!lead) {
      throw new Error('Lead not found');
    }
    return lead;
  }

  async createLead(data: Omit<NewLeadEntity, 'leadCode'>) {
    const randomNum = Math.floor(100 + Math.random() * 900);
    const leadCode = `lead-${randomNum}`;
    
    return this.repository.create({
      ...data,
      leadCode,
    });
  }

  async updateLead(id: string, data: Partial<NewLeadEntity>) {
    await this.getLeadById(id);
    return this.repository.update(id, data);
  }

  async deleteLead(id: string) {
    await this.getLeadById(id);
    return this.repository.delete(id);
  }
}
