import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { User } from '../models/user.model.js';
import { uploadOnCloudinary } from '../utils/cloudinary.js';
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

export { registerUser };
