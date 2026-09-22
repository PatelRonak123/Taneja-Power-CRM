import { LeadRepository } from '../repositories/lead.repository.js';
import { NewLeadEntity } from '../../../database/schema/leads.js';
import { JwtPayload } from '../../../common/auth/jwt.js';

export class LeadService {
  private repository = new LeadRepository();

  async listLeads(
    filters: { search?: string; status?: string; priority?: string; assignee?: string },
    user?: JwtPayload
  ) {
    return this.repository.findAll(filters, user);
  }

  async getLeadById(id: string, user?: JwtPayload) {
    const lead = await this.repository.findById(id, user);
    if (!lead) {
      throw new Error('Lead not found or access denied');
    }
    return lead;
  }

  async createLead(data: Omit<NewLeadEntity, 'leadCode'>, user?: JwtPayload) {
    const randomNum = Math.floor(100 + Math.random() * 900);
    const leadCode = `lead-${randomNum}`;
    
    return this.repository.create({
      ...data,
      leadCode,
    }, user);
  }

  async updateLead(id: string, data: Partial<NewLeadEntity>, user?: JwtPayload) {
    return this.repository.update(id, data, user);
  }

  async getPipeline(user?: JwtPayload) {
    return this.repository.getPipelineData(user);
  }

  async deleteLead(id: string, user?: JwtPayload) {
    await this.getLeadById(id, user);
    return this.repository.delete(id, user);
  }

  async addActivity(id: string, activity: { title: string; type?: string }, user?: JwtPayload) {
    return this.repository.addActivityLog(id, activity, user);
  }
}
