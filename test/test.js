var http = require('http');
var assert = require('assert');

var express = require('express');
var apiGatewayLocal = require("..");

var lambdas = require('./_lambdas');
var apiGatewayRoutes = [
  {
    lambda: function(_, context) { context.done(null, "all"); },
    method: "GET",
    path: "/{all}",
    requestTemplates: {},
    responses: {
      "200": {
        responseTemplates: {
          "text/plain": "$input.path('$')"
        },
      }
    }
  },
  {
    lambda: function(_, context) { context.done(null, "hello"); },
    method: "GET",
    path: "/hello",
    requestTemplates: {},
    responses: {
      "200": {
        responseTemplates: {
          "text/plain": "$input.path('$')"
        },
      }
    }
  },
  {
    lambda: lambdas.users.index,
    method: "GET",
    path: "/json/users",
    requestTemplates: {},
    responses: {
      "200": {
        responseTemplates: {},
      }
    }
  },
  {
    lambda: lambdas.users.index,
    method: "GET",
    path: "/json/users",
    requestTemplates: {},
    responses: {
      "200": {
        responseTemplates: {},
      }
    }
  },
  {
    lambda: lambdas.users.create,
    method: "POST",
    path: "/json/users",
    requestTemplates: {},
    responses: {
      "201": {
        responseTemplates: {},
      }
    }
  },
  {
    lambda: lambdas.users.show,
    method: "GET",
    path: "/json/users/{username}",
    requestTemplates: {
      "application/json": '{"username": "$input.params(\'username\')"}'
    },
    responses: {
      "200": {
        responseTemplates: {},
      }
    }
  },
  {
    lambda: lambdas.users.showHtml,
    method: "GET",
    path: "/html/users/{username}",
    requestTemplates: {
      "application/json": '{"username": "$input.params(\'username\')"}'
    },
    responses: {
      "200": {
        responseTemplates: {
          "text/html": "<h1>$input.path('$.name')</h1>"
        },
      }
    }
  },
  {
    lambda: lambdas.users.showHtml_v2,
    method: "GET",
    path: "/html/v2/users/{username}",
    requestTemplates: {
      "application/json": '{"username": "$input.params(\'username\')"}'
    },
    responses: {
      "200": {
        responseTemplates: {
          "text/html": "$input.path('$')"
        },
      }
    }
  }
];

var port = 3000;
var app = apiGatewayLocal(express(), apiGatewayRoutes);
var server;

var User = require('./_user');

describe('api-gateway-localdev', function() {
  describe('sample app', function() {
    before(function() {
      server = app.listen(port);
    });

    afterEach(function() {
      User.cleanup();
    });

    it("path without params should be preferred than with params", function(done) {
      req("GET", "/hello", "", function(res, data) {
        assert.equal(data, "hello");

        req("GET", "/all", "", function(res, data) {
          assert.equal(data, "all");
          done();
        });
      });
    });

    describe("GET /json/users", function() {
      beforeEach(function() {
        User.create("ToQoz");
      });

      it("returns 200", function(done) {
        req("GET", "/json/users", "", function(res, data) {
          assert.equal(res.statusCode, 200);
          done();
        });
      });

      it("returns all users as JSON", function(done) {
        req("GET", "/json/users", "", function(res, data) {
          var users = JSON.parse(data);
          assert.deepEqual(users, User.all());
          assert.equal(users[0].name, "ToQoz");
          done();
        });
      });
    });

    describe("POST /json/users", function() {
      it("returns 201", function(done) {
        req("POST", "/json/users", '{"username": "ToQoz"}', function(res, data) {
          assert.equal(res.statusCode, 201);
          done();
        });
      });

      it("creates a user", function(done) {
        var oldCount = User.count();

        req("POST", "/json/users", '{"username": "ToQoz"}', function(res, data) {
          assert.equal(User.count(), oldCount + 1);
          done();
        });
      });

      it("returns the created user as JSON", function(done) {
        req("POST", "/json/users", '{"username": "ToQoz"}', function(res, data) {
          var user = JSON.parse(data);
          assert.equal(user.name, "ToQoz");
          done();
        });
      });
    });

    describe("GET /html/users/{username}", function() {
      beforeEach(function() {
        User.create("ToQoz");
      });

      it("returns 200", function(done) {
        req("GET", "/html/users/ToQoz", '', function(res, data) {
          assert.equal(res.statusCode, 200);
          done();
        });
      });

      it("returns the user as HTML", function(done) {
        req("GET", "/html/users/ToQoz", "", function(res, data) {
          assert.equal(data, "<h1>ToQoz</h1>");
          done();
        });
      });
    });

    describe("GET /html/v2/users/{username}", function() {
      beforeEach(function() {
        User.create("ToQoz");
      });

      it("returns 200", function(done) {
        req("GET", "/html/v2/users/ToQoz", '', function(res, data) {
          assert.equal(res.statusCode, 200);
          done();
        });
      });

      it("returns the user as HTML", function(done) {
        req("GET", "/html/v2/users/ToQoz", "", function(res, data) {
          assert.equal(data, "<h1>ToQoz</h1>");
          done();
        });
      });
    });

    after(function() {
      server.close();
    });
  });
});

function req(method, path, data, cb) {
  var r = http.request({
    hostname: 'localhost',
    port: port,
    path: path,
    method: method,
  }, function(res) {
    var data = '';

    res.on('data', function(chunk) {
      data += chunk;
    });

    res.on('end', function() {
      cb(res, data);
    });
  });

  r.write(data);
  r.end();
}
