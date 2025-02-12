import { Router } from 'express';
import {
  loginUser,
  logoutUser,
  refreshAccessToken,
  changeCurrentPassword,
  registerUser,
  getCurrentUser,
  updateAccountDetails,
  updateUserAvatar,
  updateUserCoverImage,
  getUserChannelProfile,
  getUserWatchHistory,
} from '../controllers/user.controller.js';
import { upload } from '../middlewares/multer.middleware.js';
import { verifyJwt } from '../middlewares/auth.middleware.js';
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

router.route('/login').post(loginUser);
// * router.route('/api').httpmethod(functionToExecute)
//secured routes
router.route('/logout').post(verifyJwt, logoutUser);
router.route('/update-password').post(verifyJwt, changeCurrentPassword);
router.route('/get-current-user').post(verifyJwt, getCurrentUser);
router.route('/update-account-details').patch(verifyJwt, updateAccountDetails);
// middlewares are executed in sequence
// because we need to be sure user is logged in
// we move verification middleware to first
router
  .route('/update-avatar')
  .patch(verifyJwt, upload.single('avatar'), updateUserAvatar);

router
  .route('/update-cover-image')
  .patch(verifyJwt, upload.single('coverImage'), updateUserCoverImage);

router.route('/refresh-token').post(refreshAccessToken);

router.route('/ch/:username').get(verifyJwt, getUserChannelProfile);

router.route('/watchHistory').get(verifyJwt, getUserWatchHistory);

export default router;
