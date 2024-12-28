import { Router } from 'express';
import { registerUser } from '../controllers/user.controller.js';
import { upload } from '../middlewares/multer.middleware.js';
const router = Router();

// * Whenever we want to insert middleware in the code
// * just like the below code insert just before the controller function
router.route('/register').post(
  upload.fields([
    { name: 'avatar', maxCount: 1 },
    { name: 'coverImage', maxCount: 1 },
  ]),
  registerUser
);

export default router;
