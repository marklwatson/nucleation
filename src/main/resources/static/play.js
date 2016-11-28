function Molecule(rad, ttl){
    this.radius = rad;
    this.timeToLive = ttl;
    this.timeToDie = Date.now() + this.timeToLive*1000;
}

function SphereCap(pos, molecs, cs){

    this.criticalSize = cs;

    //all of the molecule instances that make up the cluster
    this.molecules = [];
    if(molecs instanceof Array){
        for(i = 0; i < molecs.length; i++){
            this.molecules.push(molecs[i]);
        }
    }
    else{
        this.molecules.push(molecs);
    }

    //the calculated radius.  it is "immutable".  Probably make this smarter
    this.radius = 0;
    for(i = 0; i < this.molecules.length; i++){
        this.radius = this.radius + this.molecules[i].radius;
    }

    //this is the actual graphic that is displayed
    this.circle = new Path.Circle({
                     center: pos,
                     radius: this.radius,
                     fillColor: 'red'
                 });


    //use this during a processing loop to flag it if it is to be removed
    this.keep = true;

    //add a "velocity" concept, and move the atoms more pixles based on velocity

    //vary velocity and desorption (and anything else?) based on Temperature

    //set up a % covered limit to end the simulation, and record the time

    //draw the grid.

}

SphereCap.prototype = {

    getRadius: function(){
        return this.radius;
    },

    move: function(){
        //this.circle.position = this.circle.position + [1,0];
        var x = 1 - Math.random() * 2;
        var y = 1 - Math.random() * 2;
        var newx = this.circle.position.x + x;
        var newy = this.circle.position.y + y;
        var newPt = new Point(newx, newy);

        this.circle.position = newPt;
    },

    collision: function(sc){
    	var dist = this.circle.position.getDistance(sc.circle.position);
    	var myrad = this.getRadius();
    	var scrad = sc.getRadius();
    	if ( (dist < (myrad + scrad)) && (dist != 0)) {
    	    return true;
    	}
        return false;
    },

    combine: function(sc){
        var position = this.circle.position.add(sc.circle.position);
        position = position.divide(2);
        var rad = this.getRadius() + sc.getRadius(); //this is wrong.  do the calc
        var molecs = [];
        for(i = 0; i < this.molecules.length; i++){
            molecs.push(this.molecules[i]);
        }
        for(i = 0; i < sc.molecules.length; i++){
            molecs.push(sc.molecules[i]);
        }
        var nsc = new SphereCap(position, molecs, this.criticalSize);

        return nsc;
    },

    desorb: function(now){
        if(this.molecules.length>=this.criticalSize){
            this.keep = true;
            return this;
        }
        var newMolecules = [];
        for(i = 0; i < this.molecules.length; i++){
            var e = this.molecules[i];
            if(e.timeToDie>=now){
                newMolecules.push(e);
            }
        }
        if(newMolecules.length>=this.molecules.length){
            this.keep = true;
            return this;
        }
        if(newMolecules.length<1){
            this.keep = false;
            return null;
        }
        this.keep = false;
        var nsc = new SphereCap(this.circle.position, newMolecules, this.criticalSize);
        return nsc;
    },

    remove: function(){
        this.circle.remove();
    }

}

var caps = [];


var canvasWidth = 750;
var canvasHeight = 750;
var timeStepSize = .25;
var lastTime = 0;

var depositionRate = 10;  //in atoms per second
var timeToLive = 300; //in seconds
var criticalSize = 3;

//var runSimulation = false;

//document.getElementById("runSimBtn").onclick = function (){
//    runSimulation = true;
//}

function onFrame(event){
    if(!globals.runSimulation){
        return;
    }

     lastTime = lastTime + event.delta;
     if(lastTime >=timeStepSize){

        //delete old dots
        desorb();

        ////add new dots
        deposit();

        process();

        lastTime = 0;
     }
}

function deposit(){
    var amountToAdd = Math.round(depositionRate*timeStepSize);
    for(k = 0; k < amountToAdd; k++){
        caps.push(new SphereCap(new Point(Math.random()*canvasWidth, Math.random()*canvasHeight),
                    new Molecule(2, timeToLive),
                    criticalSize));
    }
}

function desorb(){
    var now = Date.now();
    var newCaps = [];
    var c;
   	for (var i = 0; i < caps.length; i++) {
   	    c = caps[i].desorb(now);
   	    if(c != null){
   	        newCaps.push(c);
   	    }
    }
    for (var i = 0; i < caps.length; i++) {
        if(!caps[i].keep){
            caps[i].remove();
        }
    }

    caps = newCaps;
}

function process(){
    var newCaps = [];
   	for (var i = 0; i < caps.length; i++) {
        caps[i].move();
    }

   	for (var i = 0; i < caps.length; i++) {
       	for (var j = 0; j < caps.length; j++) {
       	    if((i!=j) && (caps[j].keep)){
                if(caps[i].collision(caps[j])){
                    caps[i].keep = false;
                    caps[j].keep = false;
                    newCaps.push(caps[i].combine(caps[j]));
                }
       	    }
        }
    }
    for (var i = 0; i < caps.length; i++) {
        if(caps[i].keep){
            newCaps.push(caps[i]);
        }
        else{
            caps[i].remove();
        }
    }
    caps = newCaps;

}

function onKeyDown(event) {
	// When a key is pressed, set the content of the text item:
	//text.content = 'The ' + event.key + ' key was pressed!';
}

