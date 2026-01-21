import express from 'express';
import { authenticate } from '../middleware/auth';
import {
  listCrews,
  createCrew,
  updateCrew,
  deleteCrew,
  addCrewMember,
  removeCrewMember,
} from '../controllers/crewController';

const router = express.Router();

router.use(authenticate);

router.get('/', listCrews);
router.post('/', createCrew);
router.put('/:id', updateCrew);
router.delete('/:id', deleteCrew);
router.post('/:id/members', addCrewMember);
router.delete('/:id/members/:memberId', removeCrewMember);

export default router;
