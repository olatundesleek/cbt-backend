export function authorizeRoles(...roles) {
  return (req, res, next) => {
    console.log(req.user);
    if (!req.user) return { error: "Not authenticated" };
    if (!roles.includes(req.user.role)) return { error: "Forbidden" };
    next();
  };
}
