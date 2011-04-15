goog.provide('peggle');

var RATIO = 30;
peggle.world = {};
peggle.Balls = [];
peggle.nextCrateIn = 0;

var b2Vec2 = Box2D.Common.Math.b2Vec2
	,	b2BodyDef = Box2D.Dynamics.b2BodyDef
	,	b2Body = Box2D.Dynamics.b2Body
	,	b2FixtureDef = Box2D.Dynamics.b2FixtureDef
	,	b2Fixture = Box2D.Dynamics.b2Fixture
	,	b2World = Box2D.Dynamics.b2World
	,	b2MassData = Box2D.Collision.Shapes.b2MassData
	,	b2PolygonShape = Box2D.Collision.Shapes.b2PolygonShape
	,	b2CircleShape = Box2D.Collision.Shapes.b2CircleShape
	,	b2DebugDraw = Box2D.Dynamics.b2DebugDraw
	, b2AABB = Box2D.Collision.b2AABB
	, b2MouseJointDef = Box2D.Dynamics.Joints.b2MouseJointDef;

peggle.mouseX = undefined;
peggle.mouseY = undefined;
peggle.mouseJoint = null;
peggle.mousePVec = undefined;
peggle.isMouseDown = false;

init = function() {
	peggle.nextCrateIn = 0;
	peggle.canvasPosition = peggle.getElementPosition(document.getElementById("canvas"));
	
	// 1. Create our world
	peggle.setupWorld();
	
	// 2. creat a walls + floor
	peggle.createWallsAndFloor();
	
	peggle.setupDebugDraw();
	
	// peggle.update();
	window.setInterval(peggle.update, 1000/60);
	
	document.addEventListener("mousedown", function(e){
		peggle.isMouseDown = true;
		peggle.handleMouseMove(e);
		document.addEventListener("mousemove", peggle.handleMouseMove, true);
	}, true);
	
	document.addEventListener("mouseup", function(){
		document.removeEventListener("mousemove", peggle.handleMouseMove, true);
		peggle.isMouseDown = false;
		peggle.mouseX = undefined;
		peggle.mouseY = undefined;
	}, true);
	
};

peggle.handleMouseMove = function(e) {
	peggle.mouseX = (e.clientX - peggle.canvasPosition.x) / RATIO;
	peggle.mouseY = (e.clientY - peggle.canvasPosition.y) / RATIO;
};

peggle.getBodyAtMouse = function() {
	peggle.mousePVec = new b2Vec2(peggle.mouseX, peggle.mouseY);
	var aabb = new b2AABB();
	aabb.lowerBound.Set(peggle.mouseX - 0.001, peggle.mouseY - 0.001);
	aabb.upperBound.Set(peggle.mouseX + 0.001, peggle.mouseY + 0.001);
	
	// console.log("getBodyAtMouse");
	peggle.selectedBody = null;
	peggle.world.QueryAABB(peggle.getBodyCB, aabb);
	return peggle.selectedBody;
};

peggle.getBodyCB = function(fixture) {
	console.log(fixture);
	if(fixture.GetBody().GetType() != b2Body.b2_staticBody) {
		if(fixture.GetShape().TestPoint(fixture.GetBody().GetTransform(), peggle.mousePVec)) {
			peggle.selectedBody = fixture.GetBody();
			return false;
		};
	};
	return true;
};

peggle.setupDebugDraw = function() {
	var debugDraw = new b2DebugDraw();
	debugDraw.SetSprite(document.getElementById("canvas").getContext("2d"));
	debugDraw.SetDrawScale(30.0);
	debugDraw.SetFillAlpha(0.3);
	debugDraw.SetLineThickness(1.0);
	debugDraw.SetFlags(b2DebugDraw.e_shapeBit | b2DebugDraw.e_jointBit);
	peggle.world.SetDebugDraw(debugDraw);
};

peggle.update = function() {
	// console.log(peggle.isMouseDown);
	if(peggle.isMouseDown && (!peggle.mouseJoint)) {
		var body = peggle.getBodyAtMouse();
		if(body) {
			var md = new b2MouseJointDef();
			md.bodyA = peggle.world.GetGroundBody();
			md.bodyB = body;
			md.target.Set(peggle.mouseX, peggle.mouseY);
			md.collideConnected = true;
			md.maxForce = 300.0 * body.GetMass();
			peggle.mouseJoint = peggle.world.CreateJoint(md);
			body.SetAwake(true);
		};
	};
	
	if(peggle.mouseJoint) {
		if(peggle.isMouseDown) {
			peggle.mouseJoint.SetTarget(new b2Vec2(peggle.mouseX, peggle.mouseY));
		} else {
			peggle.world.DestroyJoint(peggle.mouseJoint);
			peggle.mouseJoint = null;
		};
	};
		
	if(peggle.world.m_bodyCount < 80 && peggle.nextCrateIn-- <= 0) {
		peggle.addRandomCrate();
		
		peggle.nextCrateIn = 5;
	};
	
	peggle.world.Step(1/60, 10, 10);
	peggle.world.DrawDebugData();
	peggle.world.ClearForces();
	
};

peggle.addRandomCrate = function() {
	// 1. create shape def
	var fallingCrateDef = new b2FixtureDef;
	fallingCrateDef.friction = 0.3;
	fallingCrateDef.restitution = 0.5;
	fallingCrateDef.density = 0.2 + Math.random() * 5;
	
	// 2. create body def
	var fallingBodyDef = new b2BodyDef;
	fallingBodyDef.type = b2Body.b2_dynamicBody;
	if (Math.random() > 0.5) {
		fallingCrateDef.shape = new b2PolygonShape;
		fallingCrateDef.shape.SetAsBox(peggle.randomInt(5, 10) / RATIO, peggle.randomInt(5, 40) / RATIO);	
	} else {
		fallingCrateDef.shape = new b2CircleShape(peggle.randomInt(10, 30) / RATIO);
	};
	fallingBodyDef.position.x = peggle.randomInt(15, 530) / RATIO;
	fallingBodyDef.position.y = peggle.randomInt(-100, -10) / RATIO;
	fallingBodyDef.angle = peggle.randomInt(0, 360) * Math.PI / 180;
		
	var fallingCrate = peggle.world.CreateBody(fallingBodyDef).CreateFixture(fallingCrateDef);
};

peggle.randomInt = function(lowVal, hiVal) {
	return ( lowVal + Math.floor(Math.random() * (hiVal - lowVal + 1)) );
};

peggle.setupWorld = function() {
	// 1. define hte gravity
	var gravity = new b2Vec2(0, 10);
	
	// 2. ignore sleeping objects?
	var ignoreSleeping = true;
	
	peggle.world = new b2World(gravity, ignoreSleeping);
};

peggle.createWallsAndFloor = function() {
	// 1. create shape def
	var fixDef = new b2FixtureDef;
  fixDef.density = 0.0;
  fixDef.friction = 0.5;
  fixDef.restitution = 0.3;

	// 2. creat body def
	var bodyDef = new b2BodyDef;
	bodyDef.type = b2Body.b2_staticBody;
	bodyDef.position.x = 0 / RATIO;
	bodyDef.position.y = 390 / RATIO;
	fixDef.shape = new b2PolygonShape;
	fixDef.shape.SetAsBox(550 / RATIO, 10 / RATIO);
	
	// 3. create body
	var floorBody = peggle.world.CreateBody(bodyDef).CreateFixture(fixDef);
	// need to set mass in the world
};

peggle.getElementPosition = function(element) {
   var elem=element, tagname="", x=0, y=0;
  
   while((typeof(elem) == "object") && (typeof(elem.tagName) != "undefined")) {
      y += elem.offsetTop;
      x += elem.offsetLeft;
      tagname = elem.tagName.toUpperCase();

      if(tagname == "BODY")
         elem=0;

      if(typeof(elem) == "object") {
         if(typeof(elem.offsetParent) == "object")
            elem = elem.offsetParent;
      }
   }

   return {x: x, y: y};
}
