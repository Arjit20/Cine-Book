export const errorHandler = (err, req, res, next) => {
     console.error(err.stack); // Topic 19: Stack Trace
     res.status(500).render("error", { message: "Something went wrong! Please try again." }); // Topic 44
   };