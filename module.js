// ==============================
// AUTH MODULE
// ==============================

const AuthModule = {

    register: function(userData){
        localStorage.setItem("registeredUser", JSON.stringify(userData));
    },

    login: function(username, password, role){
        let savedUser = JSON.parse(localStorage.getItem("registeredUser"));

        if(!savedUser) return false;

        if(
            savedUser.username === username &&
            savedUser.password === password &&
            savedUser.role === role
        ){
            localStorage.setItem("isLoggedIn","true");
            localStorage.setItem("userRole",role);
            return true;
        }

        return false;
    },

    logout: function(){
        if(!window.confirm("Log out now?")) return;
        localStorage.clear();
        window.location.href = "index.html";
    },

    checkSession: function(){
        return localStorage.getItem("isLoggedIn") === "true";
    }
};
