var credentials = require('./credentials');

exports.index = function(req,res,next){
		res.render('index');
	}

exports.controlPanel = function(req, res, next){
		res.render('controlpanel');
	}

exports.login = function(req, res, next){
		res.render('login');
	}

exports.validate = function(req, res, next){
	var valid = false;
		if(req.body.username == '' || req.body.password == '')
			return res.render('login', {error: 'Please provide Username & Password'});
		for(var i =0; i< credentials.length; i++)
		{
			if(req.body.username == credentials[i].username && req.body.password == credentials[i].password)
			{
				valid = true;
				req.session.username = req.body.username;
				res.redirect('controlpanel');
			}
		}
		if(valid == false)
			return res.render('login', {error: 'Username or Password does not match'});
	}