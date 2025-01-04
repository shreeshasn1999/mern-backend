import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { User } from '../models/user.model.js';
import {
  deleteFromCloudinary,
  uploadOnCloudinary,
} from '../utils/cloudinary.js';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

async function generateAccessAndRefreshToken(userId) {
  try {
    console.log('first');
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });
    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      'Something went wrong while generating refersh and access tokens'
    );
  }
}

const registerUser = asyncHandler(async function (req, res) {
  //TODO: Take user details from frontend
  const { username, email, fullName, password } = req.body;
  console.log('username: ', username);
  console.log('email: ', email);
  console.log('fullName: ', fullName);
  console.log('password: ', password);
  //TODO: Check if user has sent the required data or not
  //? No: Send an error message of 400
  //? Yes: Then proceed further with the data

  // if (fullName === '') {
  //   throw new ApiError(400, 'fullName is required');
  // }

  if (
    ['username', 'email', 'fullName', 'password'].some(
      (field) => field?.trim() === ''
    )
  ) {
    throw new ApiError(400, 'All fields are required');
  }

  //TODO: check if user already exists: username and email
  // db look up takes time always await
  const existingUser = await User.findOne({ $or: [{ username }, { email }] });
  console.log('existingUser', existingUser);
  if (existingUser) {
    throw new ApiError(409, 'User with username or email already exists');
  }
  //TODO: Check if image files exists
  // console.log(req.files);
  // middleware adds properties to request
  console.log(req.files);
  const avatarLocalPath = req.files?.avatar[0]?.path;

  let coverImageLocalPath;
  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  )
    coverImageLocalPath = req.files.coverImage[0].path;

  //TODO: Check avatar
  if (!avatarLocalPath) {
    throw new ApiError(400, 'Avatar is required');
  }
  //TODO: Perform any upload operation required with cloudinary,multer and cloudinary avatar
  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);
  if (!avatar) {
    throw new ApiError(400, 'Avatar field is required');
  }
  // TODO: create user object
  const user = await User.create({
    fullName,
    email,
    avatar: avatar.url,
    coverImage: coverImage?.url || '',
    password,
    username: username.toLowerCase(),
  });
  // TODO: After everything store in mongo , creation of user
  console.log(user);
  // TODO: Remove password and refresh token field from data
  const createdUser = await User.findById(user._id).select(
    '-password -refreshToken'
  );
  // TODO : Check if user is created or not
  if (!createdUser) {
    throw new ApiError(500, 'Error while registering user');
  }
  // TODO : If yes then go ahead and send
  return res
    .status(201)
    .json(new ApiResponse(200, createdUser, 'User registered successfully'));
});

const loginUser = asyncHandler(async function (req, res) {
  // TODO: take details from frontend
  const { username, email, password } = req.body;
  // TODO: validation
  if (!username && !email) {
    throw new ApiError(400, 'username or password is required');
  }
  // TODO: confirm if user exists or not
  const userFound = await User.findOne({ $or: [{ username }, { email }] });
  // ? No : return error saying no credentials found
  if (!userFound) {
    throw new ApiError(404, 'User does not exist');
  }
  // ? Yes : proceed
  const isValidPassword = await userFound.isPasswordCorrect(password);
  if (!isValidPassword) {
    throw new ApiError(401, 'Invalid user credentials');
  }
  // TODO: create both refresh and access tokens
  const { refreshToken, accessToken } = await generateAccessAndRefreshToken(
    userFound._id
  );
  // TODO: If generated successfully send them to the user
  //* user object we have the access of inside this method is not updated with the refresh token
  //* So we need to get the updated user. Current code is to access the db again to fetch the user
  const updatedUser = await User.findById(userFound._id).select(
    '-password -refreshToken'
  );
  // TODO: send secure cookie
  const options = {
    httpOnly: true,
    secure: true,
  };
  return res
    .status(200)
    .cookie('accessToken', accessToken, options)
    .cookie('refreshToken', refreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          user: updatedUser,
          refreshToken,
          accessToken,
        },
        'User logged In Successfully'
      )
    );
});

const logoutUser = asyncHandler(async function (req, res) {
  const { _id } = req.user;
  console.log(req.user);
  const user = await User.findByIdAndUpdate(
    _id,
    {
      $set: {
        refreshToken: '',
      },
    },
    { new: true }
  );
  console.log(user);
  const options = {
    httpOnly: true,
    secure: true,
  };
  return res
    .status(200)
    .clearCookie('accessToken', options)
    .clearCookie('refreshToken', options)
    .json(new ApiResponse(200, {}, 'User logged out successfully'));
});

const refreshAccessToken = asyncHandler(async function (req, res) {
  // TODO: access refresh token through cookies.
  const incomingRefreshToken =
    req.cookies?.accessToken || req.body.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError(401, 'unauthorized request');
  }

  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    const user = await User.findById(decodedToken._id);

    if (!user) {
      throw new ApiError(401, 'Invalid refresh token');
    }
    // TODO: check in database if it matches or not
    // ? No : Relogin user / basically no auth
    if (incomingRefreshToken !== user?.refreshToken) {
      throw new ApiError(401, 'Refresh token expired or used');
    }

    // ? Yes : Generate new access token and send it to the user
    const options = {
      httpOnly: true,
      secure: true,
    };

    const { accessToken, refreshToken: newRefreshToken } =
      await generateAccessAndRefreshToken(user._id);

    return res
      .status(200)
      .cookie('accessToken', accessToken, options)
      .cookie('refreshToken', newRefreshToken, options)
      .json(
        new ApiResponse(
          200,
          { accessToken, refreshToken: newRefreshToken },
          'Access token refreshed'
        )
      );
  } catch (error) {
    throw new ApiError(401, error?.message || 'Invalid refresh token');
  }
});

const changeCurrentPassword = asyncHandler(async function (req, res) {
  // TODO : Get current user details from request cookies using custom middleware.
  // * The above will take care of the case where the user is not logged in.
  const { _id } = req.user;
  const { oldPassword, newPassword } = req.body;

  // TODO : Fetch the user details from db and update the password.
  const userDetails = await User.find(_id);
  // password encrypted ada adake custom method upyogsad
  const isPasswordValid = await userDetails.isPasswordCorrect(oldPassword);

  // TODO : If successful then send success message.
  if (!isPasswordValid) {
    throw new ApiError(401, 'Wrong old password');
  }

  userDetails.password = newPassword;
  await userDetails.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, 'Password has been changed successfully'));
});

const getCurrentUser = asyncHandler(async function (req, res) {
  return res
    .status(200)
    .json(new ApiResponse(200, req.user, 'Current user fetched successfully'));
});

const updateAccountDetails = asyncHandler(async function (req, res) {
  const { fullName, email } = req.body;

  if (!fullName || !email) {
    throw new ApiError(401, 'All fields are required');
  }

  const updatedUser = await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        fullName,
        email,
      },
    },
    { new: true }
  ).select('-password -refreshToken');
  return res
    .status(200)
    .json(
      new ApiResponse(200, updatedUser, 'Account details updated successfully')
    );
});

const updateUserAvatar = asyncHandler(async function (req, res) {
  const newAvatarLocalPath = req.file?.path;
  if (!newAvatarLocalPath) {
    throw new ApiError(400, 'Avatar file is missing');
  }
  const newAvatar = await uploadOnCloudinary(newAvatarLocalPath);

  if (!newAvatar.url) {
    throw new ApiError(500, 'Error while uploading avatar file to cloudinary');
  }

  const userWithNewAvatar = await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        avatar: newAvatar.url,
      },
    },
    { new: true }
  ).select('-password -refreshToken');

  return res
    .status(200)
    .json(
      new ApiResponse(200, userWithNewAvatar, 'Avatar updated successfully')
    );
  // const oldAvatar = req.user.avatar;
  // await deleteFromCloudinary(oldAvatar);
});

const updateUserCoverImage = asyncHandler(async function (req, res) {
  const newCoverImageLocalPath = req.file?.path;
  if (!newCoverImageLocalPath) {
    throw new ApiError(400, 'Cover Image file is missing');
  }
  const newCoverImage = await uploadOnCloudinary(newCoverImageLocalPath);

  if (!newCoverImage.url) {
    throw new ApiError(
      500,
      'Error while uploading cover image file to cloudinary'
    );
  }

  const userWithNewCoverImage = await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        coverImage: newCoverImage.url,
      },
    },
    { new: true }
  ).select('-password -refreshToken');

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        userWithNewCoverImage,
        'Cover image updated successfully'
      )
    );
  // const oldAvatar = req.user.avatar;
  // await deleteFromCloudinary(oldAvatar);
});

const getUserChannelProfile = asyncHandler(async function (req, res) {
  const { username } = req.params;
  if (!username?.trim()) {
    throw new ApiError(400, 'username is missing');
  }
  const channel = await User.aggregate([
    {
      $match: {
        username: username?.toLowerCase(),
      },
    },
    // * Pipeline to get subs
    {
      $lookup: {
        from: 'subscriptions',
        localField: '_id', // * Which field to see from the local document
        foreignField: 'channel', // * with what we have to match with
        as: 'subscribers',
      },
    },
    // Pipeline to get whom the current user is subbed to
    {
      $lookup: {
        from: 'subscriptions',
        localField: '_id',
        foreignField: 'subscriber',
        as: 'subscribedTo',
      },
    },
    {
      $addFields: {
        subscribersCount: {
          $size: '$subscribers', // $ sign is very important because we want to take size of subscribers field
        },
        subscribedToCount: {
          $size: '$subscribedTo',
        },
        isSubscribed: {
          $cond: {
            if: { $in: [req.user?._id, '$subscribers.subscriber'] },
            then: true,
            else: false,
          },
        },
      },
    },
    {
      $project: {
        username: 1,
        fullName: 1,
        subscribersCount: 1,
        subscribedToCount: 1,
        isSubscribed: 1,
        email: 1,
        avatar: 1,
        coverImage: 1,
      },
    },
  ]);

  if (!channel?.length) {
    throw new ApiError(404, 'User does not exist');
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, channel[0], 'User profile fetched successfully')
    );
});

const getUserHistory = asyncHandler(async function (req, res) {
  const user = await User.aggregate([
    {
      // _id:requ.user._id this is wrong because id given by mongoose has already converted to string
      // So in essence it is trying to match an object and a string so we need to pass an object
      // but aggregation pipelines go directly to mongo db
      $match: {
        _id: new mongoose.Types.ObjectId(req.user._id),
      },
    },
    {
      $lookup: {
        from: 'videos',
        localField: 'watchHistory',
        foreignField: '_id',
        as: 'watchHistory',
        // within a pipeline we can have another pipeline using the pipeline property.
        pipeline: [
          {
            $lookup: {
              from: 'users',
              localField: 'owner',
              foreignField: '_id',
              as: 'owner',
              pipeline: [
                {
                  $project: {
                    fullName: 1,
                    username: 1,
                    avatar: 1,
                  },
                },
              ],
            },
          },
          {
            $addFields: {
              owner: {
                $first: '$owner',
              },
            },
          },
        ],
      },
    },
  ]);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        user[0].watchHistory,
        "User's watch history fetched successfully!"
      )
    );
});

export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateAccountDetails,
  updateUserAvatar,
  updateUserCoverImage,
  getUserChannelProfile,
  getUserHistory,
};
