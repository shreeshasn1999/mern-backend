// function asyncHandler(func) {
//   return async function (req, res, next) {
//     try {
//       await func(req, res, next);
//     } catch (error) {
//       console.log(error);
//       next(error)
//       res
//         .status(error.code || 500)
//         .json({ success: false, message: error.message });
//     }
//   };
// }

function asyncHandler(func) {
  return function (req, res, next) {
    Promise.resolve(func(req, res, next)).reject((error) => {
      next(error);
      res
        .status(error.code || 500)
        .json({ success: false, message: error.message });
    });
  };
}

// * Async function returned as arrow
// const asyncHandlerActual = () => {return async () =>{}}

// * Async function returned as arrow function directly
// const asyncHandler = () => async() =>{}

export { asyncHandler };
