import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { User } from '../models/user.model.js';
import { uploadOnCloudinary } from '../utils/cloudinary.js';
import jwt from 'jsonwebtoken';

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
          user: userFound,
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

  if (incomingRefreshToken) {
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

export { registerUser, loginUser, logoutUser, refreshAccessToken };
