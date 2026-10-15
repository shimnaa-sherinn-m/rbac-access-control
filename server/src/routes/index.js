import { Router } from 'express';
import { authenticate, requireSystemAdmin } from '../middleware/auth.js';
import auditLogsRouter from './auditLogs.js';
import authRouter from './auth.js';
import demoRouter from './demo.js';
import metaRouter from './meta.js';
import notificationsRouter from './notifications.js';
import reportsRouter from './reports.js';
import rolesRouter from './roles.js';
import usersRouter from './users.js';

const router = Router();

router.use('/auth', authRouter);

router.use(authenticate);
router.use('/', metaRouter);
router.use('/demo', demoRouter);

router.use(requireSystemAdmin);
router.use('/roles', rolesRouter);
router.use('/users', usersRouter);
router.use('/reports', reportsRouter);
router.use('/audit-logs', auditLogsRouter);
router.use('/notifications', notificationsRouter);

export default router;
