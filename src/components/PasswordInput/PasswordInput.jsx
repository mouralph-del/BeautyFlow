import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

import "./PasswordInput.css";

function PasswordInput({ label, ...inputProps }) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <label>
      {label}
      <span className="password-input">
        <input {...inputProps} type={showPassword ? "text" : "password"} />
        <button
          type="button"
          className="password-input__toggle"
          aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
          aria-pressed={showPassword}
          onClick={() => setShowPassword((current) => !current)}
        >
          {showPassword ? <EyeOff size={19} aria-hidden="true" /> : <Eye size={19} aria-hidden="true" />}
        </button>
      </span>
    </label>
  );
}

export default PasswordInput;
