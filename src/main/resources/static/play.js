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

    //set velocity based on temp.  Figure out the algorithm
    //set desorption rate based on pressure and temp
    //set deposit rate based on pressure and temp
    //re-read nucleation section to make sure all of this is accurate and see if you
    //can vary anything else 

}

SphereCap.prototype = {

    getRadius: function(){
        return this.radius;
    },

    move: function(){
        var rand = (2*Math.random()) - 1; //gives me a number between -1 and 1
        var x = rand * speedRatio;
        rand = (2*Math.random()) - 1; //gives me a number between -1 and 1
        var y = rand * speedRatio;
        //var x = (1 - Math.random()) * 2;  //speedRatio
        //var y = (1 - Math.random()) * 2;  //used to be 2
        var newx = this.circle.position.x + x;
        var newy = this.circle.position.y + y;

        var newPt = new Point(newx, newy);

        this.circle.position = newPt;
        this.checkBorders();
    },

    checkBorders: function(){
        if((this.circle.position.x - this.radius)<0){
            this.circle.position.x = this.radius;
        }
        if((this.circle.position.x + this.radius)>canvasWidth){
            this.circle.position.x = canvasWidth - this.radius;
        }
        if((this.circle.position.y - this.radius)<0){
            this.circle.position.y = this.radius;
        }
        if((this.circle.position.y + this.radius)>canvasHeight){
            this.circle.position.y = canvasHeight - this.radius;
        }
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
        nsc.checkBorders();
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
    },

    area: function(){
        return this.circle.area;
    }

}

var caps = [];


var canvasWidth = 550;
var canvasHeight = 550;
var canvasArea = canvasWidth*canvasHeight;
var timeStepSize = .25;
var lastTime = 0;

var depositionRate = 10;  //in atoms per second
var criticalSize = 3;

var running = false;
var temp = 300;
var pressure = -4;
var timeToLive = 300; //in seconds
var startTime = 0;

var pi = 3.14;
var piSqd = pi*pi;

var speedRatio = 4;

//myCanvas.width = canvasWidth;
//myCanvas.height = canvasHeight;

var rect = new Rectangle(new Point(1,1), new Size(canvasWidth-2, canvasHeight-2));
var frameRect = new Path.Rectangle(rect);
frameRect.strokeColor = 'black';

function onFrame(event){
    if(!running){
        if(globals.runSimulation){
            resetGrid();
            temp = globals.temp;
            pressure = globals.pressure;
            depositionRate = globals.depRate;
            startTime = Date.now();
            running = true;
        }
        else{
            return;
        }
    }
    else{
        if(!globals.runSimulation){
            running = false;
            return;
        }
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

function resetGrid(){
    for(i = 0; i < caps.length; i++){
        caps[i].remove();
    }
    caps = [];
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
    var totalCapArea = 0;
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
                    var nc = caps[i].combine(caps[j]);
                    newCaps.push(nc);
                    totalCapArea = totalCapArea + nc.area();
                }
       	    }
        }
    }

    for (var i = 0; i < caps.length; i++) {
        if(caps[i].keep){
            newCaps.push(caps[i]);
            totalCapArea = totalCapArea + caps[i].area();
        }
        else{
            caps[i].remove();
        }
    }

    caps = newCaps;

    if((totalCapArea)>=(piSqd*canvasArea)){
        globals.runSimulation = false;
        running = false;
        var endTime = Date.now();
        var totalTime = endTime - startTime;
        globals.simulationEnded(totalTime);
    }

}

function onKeyDown(event) {
	// When a key is pressed, set the content of the text item:
	//text.content = 'The ' + event.key + ' key was pressed!';
}

