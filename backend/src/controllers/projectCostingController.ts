import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../config/database';
import { resolveProjectAccessProfile } from '../utils/projectAccess';
import { getCosting, validateCosting } from '../utils/projectPricing';

/** Guarda exclusivamente Costos; evita pisar cambios de otra pestaña o sesión. */
export async function saveProjectCosting(req: AuthRequest, res: Response) {
  let costing;
  try { costing = validateCosting(req.body); }
  catch (error: any) { return res.status(400).json({error:error.message}); }
  try {
    const project = await prisma.project.findUnique({where:{id:req.params.id}});
    if (!project) return res.status(404).json({error:'Proyecto no encontrado.'});
    const access = await resolveProjectAccessProfile(project,{userId:req.user?.userId,orgId:req.user?.orgId || null,role:req.user?.role});
    if (!access.canEdit || !access.canViewFinancials || !access.allowedTabs.includes('costs')) return res.status(403).json({error:'No tenés permiso para editar costos.'});
    if (getCosting(project).revision !== costing.revision) return res.status(409).json({error:'Los costos cambiaron en otra sesión. Recargá el proyecto antes de guardar.'});
    const saved = {...costing,revision:costing.revision+1};
    const result = await prisma.project.updateMany({where:{id:project.id,updatedAt:project.updatedAt},data:{exportSettings:{...((project.exportSettings as any)||{}),costing:saved} as any}});
    if (result.count !== 1) return res.status(409).json({error:'El proyecto cambió mientras editabas. Recargá antes de guardar.'});
    return res.json(saved);
  } catch { return res.status(500).json({error:'No se pudieron guardar los costos.'}); }
}
