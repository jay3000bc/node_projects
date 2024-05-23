import AdminLogin from "../components/AdminLogin";
import AdminPanel from "../components/AdminPanel";
import { useAdmin } from "../context/AuthContext";

const Admin = () => {
  const { admin } = useAdmin();
  console.log(`Admin componenet called`)
  return admin ? <AdminPanel /> : <AdminLogin />;
};

export default Admin;
