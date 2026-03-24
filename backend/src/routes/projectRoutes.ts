import express from 'express';
import {
  createProject,
  getProjects,
  getProjectById,
  updateProject,
  deleteProject,
  exportToExcel,
  createProjectPackage,
  downloadProjectPackage,
} from '../controllers/projectController';
import { authenticate } from '../middleware/auth';
import { canWrite } from '../middleware/permissions';

const router = express.Router();

router.use(authenticate);

router.post('/', canWrite, createProject);
router.get('/', getProjects);
router.get('/:id', getProjectById);
router.put('/:id', canWrite, updateProject);
router.delete('/:id', canWrite, deleteProject);
router.post('/:id/export-excel', exportToExcel);
router.post('/:id/project-package', createProjectPackage);
router.get('/:id/project-package/download', downloadProjectPackage);

export default router;
