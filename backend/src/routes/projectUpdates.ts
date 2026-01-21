import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { projectUpdateController } from '../controllers/projectUpdateController';

const router = Router();

// Todas las rutas requieren autenticación
router.use(authenticate);

// Obtener todas las actualizaciones de un proyecto
router.get('/project/:projectId', projectUpdateController.getByProject);
router.get('/project/:projectId/timeline', projectUpdateController.getTimeline);

// Crear una nueva actualización
router.post('/project/:projectId', projectUpdateController.create);

// Obtener una actualización específica
router.get('/:id', projectUpdateController.getById);

// Actualizar una actualización
router.put('/:id', projectUpdateController.update);

// Eliminar una actualización
router.delete('/:id', projectUpdateController.delete);

export default router;
