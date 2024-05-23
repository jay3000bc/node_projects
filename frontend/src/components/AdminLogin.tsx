import axios from "axios"; // Import Axios
import { port } from "../config";
import { useState, useRef, useEffect } from "react";
import { useAdmin } from "../context/AuthContext";

const AdminLogin = () => {
  const { setAdmin } = useAdmin();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const emailInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false); // State to store loading status

  useEffect(() => {
    if (emailInputRef.current) {
      emailInputRef.current.focus();
    }
  }, []);

  // Function to validate email using regex
  const validateEmail = (email: string) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setLoading(true); // Set loading to true when form is submitted

    // Replace this with your actual Axios API call
    if (validateEmail(email)) {
      try {
        const response = await axios.post(
          port+'/api/admin/login',
          { email, password },
          { withCredentials: true } // Set withCredentials to true
        );

        console.log(response.data);

        if (response.status === 200) {
          const { email, name, accessToken } = response.data;
          setAdmin({ emailId: email, name, accessToken });
        } else {
          setError('Invalid credentials.');
        }
      } catch (err) {
        console.error("Error while logging in:", err);
        setError('Invalid credentials.');
      } finally {
        setLoading(false); // Set loading to false after form submission completes
      }
    } else {
      setError('Please enter a valid email address.');
      setLoading(false); // Set loading to false if email is invalid
    }
  };

  return (
    <div className="mx-auto w-[420px] card bg-base-200 p-5">
      <h2 className="text-center font-bold text-2xl pt-3">Admin Login</h2>

      <form className="card-body" onSubmit={handleSubmit}>
        <label className="label pb-0">
          <span className="label-text">Email</span>
        </label>
        <input
          ref={emailInputRef}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="abc@gmail.com"
          type="email"
          className="input input-bordered"
          required
        />

        <label className="label mt-2 pb-0">
          <span className="label-text">Password</span>
        </label>
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="******"
          type="password"
          className="mb-3 input input-bordered"
          required
        />

        {error && <p className="text-red-600">{error}</p>}

        <button type="submit" className={`btn btn-primary mb-3 ${loading ? 'opacity-50 cursor-not-allowed' : ''}`} disabled={loading}>
          {loading ? 'Loading...' : 'Login'}
        </button>

      </form>
    </div>
  );
};

export default AdminLogin;
