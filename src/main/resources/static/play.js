function Molecule(rad, ttl){
    this.radius = rad;
    this.timeToLive = ttl;
    this.timeToDie = Date.now() + this.timeToLive*1000;
}

/*
Object definition of a sphere cap.
*/
function SphereCap(pos, molecs, cs){

    //number of smaller SphereCaps in the cluster to prevent desorption
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

    //the calculated radius.  it is "immutable".
    this.radius = 0;
    for(i = 0; i < this.molecules.length; i++){
        this.radius = addRadii(this.radius, this.molecules[i].radius,2);
    }

    //this is the actual graphic that is displayed
    this.circle = new Path.Circle({
                     center: pos,
                     radius: this.radius,
                     fillColor: 'red'
                 });


    //use this during a processing loop to flag it if it is to be removed
    this.keep = true;

}

/*
Object methods for a Sphere Cap
*/
SphereCap.prototype = {

    getRadius: function(){
        return this.radius;
    },

    /*
    Moves this cap according to the calculated maxDiffusionJumps
    */
    move: function(){
        var rand = (2*Math.random()) - 1; //gives me a number between -1 and 1
        var x = rand * maxDiffusionJumps;
        rand = (2*Math.random()) - 1; //gives me a number between -1 and 1
        var y = rand * maxDiffusionJumps;
        var newx = this.circle.position.x + x;
        var newy = this.circle.position.y + y;

        var newPt = new Point(newx, newy);

        this.circle.position = newPt;
        this.checkBorders();
    },

    /*
    Determines if this cap is created or moved close to the border, and moves it away if so.
    */
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

    /*
    Determines if this dot has collided with the passed in dot
    */
    collision: function(sc){
    	var dist = this.circle.position.getDistance(sc.circle.position);
    	var myrad = this.getRadius();
    	var scrad = sc.getRadius();
    	if ( (dist < (myrad + scrad)) && (dist != 0)) {
    	    return true;
    	}
        return false;
    },

    /*
    Creates a new dot that is the combination of this dot and the passed in dot
    */
    combine: function(sc){
        var position = this.circle.position.add(sc.circle.position);
        position = position.divide(2);
        //var rad = addRadii(this.getRadius(), sc.getRadius());
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

    /*
    Determines if any dot within the cluster should desorb.
    If so, it will set itself to be removed and return a new dot with the desorbed dot out of the cluster.
    If no more dots remain in the cluster, it will just set itself it be removed and return null.
    If it shouldn't be removed, it will return null.
    */
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


//simulation environment parameters
var canvasWidth = 550;
var canvasHeight = 550;
var canvasArea = canvasWidth*canvasHeight;
var timeStepSize = .25;
var pi = Math.PI;
var piSqd = pi*pi;

//process flow variables
var running = false;
var lastTime = 0;
var startTime = 0;

//global list of caps
var caps = [];

//varying parameters per simulation
var temp = 300;  // set by user
var pressure = -4;  // set by user
var criticalSize = 3;   //set by user
var depositionRate = 10;  //in atoms per second.  calculated based on temp/pressure
var timeToLive = 300; //in seconds.  calculated based on temp/pressure ???
var maxDiffusionJumps = 4;//in arb units.  calculated based on temp

/*
  Called once on page load
*/
function initializePage(){
    var rect = new Rectangle(new Point(1,1), new Size(canvasWidth-2, canvasHeight-2));
    var frameRect = new Path.Rectangle(rect);
    frameRect.strokeColor = 'black';
}

initializePage();

/*
Determines if the process should be run on an invocation of onFrame
*/
function doRun(){
    if(!running){
        if(globals.runSimulation){
            setParameters();
            resetGrid();
            temp = globals.temp;
            pressure = globals.pressure;
            startTime = Date.now();
            running = true;
            return true;
        }
        else{
            return false;
        }
    }
    else{
        if(!globals.runSimulation){
            running = false;
            return false;
        }
        return true;
    }
}

/*
Perform all calculations based on input values
*/
function setParameters(){
    temp = globals.temp;
    pressure = globals.pressure;
    criticalSize = globals.criticalSize;

    //validate input temperature
    if(temp<0){
        temp = 0;
    }
    if(temp>1687.15){
        temp = 1687.15;
    }

    //validate input pressure
    pressure = Math.abs(pressure);
    if(pressure > 9){
        pressure = 9;
    }

    //validate critical size
    if(criticalSize<1){
        criticalSize = 1;
    }
    if(criticalSize>10){
        criticalSize = 10;
    }

    //Surface Diffusion.  set velocity based on temp.
    maxDiffusionJumps = calculateMaxDiffusionJumps(temp);  //default 4

    //set timeToLive or (desorption rate) static.
    timeToLive = 10; //in seconds.

    //set deposit rate based on pressure and temp.
    depositionRate = calculateDepRate(pressure, temp);  //in atoms per second.  default 10

}

/*
Calculates the deposition rate from pressure and temp.
The pressure value is expected to be a value from 0 to 9 where 9 represents 10^(-9) torr
The temp is expected to be from 0 to the max temperature value in K
*/
function calculateDepRate(pressure, temp){
    var realPressure = Math.pow(10, (-1*pressure));
    var sqrtTemp = Math.sqrt(temp);
    var ptratio = realPressure/sqrtTemp;
    return (3.01492*Math.pow(10, 10))*ptratio;
}

/*
Calculates the maxDiffusionJumps based on temp
 */
function calculateMaxDiffusionJumps(temp){
    if(temp<1){
        return 0;
    }
    if(temp<401){
        return 1;
    }
    if(temp<801){
        return 2;
    }
    if(temp<1201){
        return 3;
    }
    return 4;
}

function addRadii(r1, r2){
    return Math.sqrt(Math.pow(r1,2) + Math.pow(r2,2));
}

/*
Clear off dots from previous run
*/
function resetGrid(){
    for(i = 0; i < caps.length; i++){
        caps[i].remove();
    }
    caps = [];
}

/*
Add dots according to calculated rate
*/
function deposit(){
    var amountToAdd = Math.round(depositionRate*timeStepSize);
    for(k = 0; k < amountToAdd; k++){
        caps.push(new SphereCap(new Point(Math.random()*canvasWidth, Math.random()*canvasHeight),
                    new Molecule(2, timeToLive),
                    criticalSize));
    }
}

/*
Remove dots according to calculated rate.
*/
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

/*
  The complex processing of a single processing.
  First, it moves the dots according to the calculated rate.
  Next it detects collisions.  It will combine dots that collide into a single dot.
  Next it will remove the dots that collided (because combining just adds a new one without removing the old).
  Finally, it compares the area covered vs. the total area and terminates the simulation if it's enough.
*/
function process(){
    //var totalCapArea = 0;
    var largestCapArea = 0;
    var tarea = 0;
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
                    tarea = nc.area();
                    if(tarea>largestCapArea){
                        largestCapArea = tarea;
                    }
                    //totalCapArea = totalCapArea + nc.area();
                }
       	    }
        }
    }

    for (var i = 0; i < caps.length; i++) {
        if(caps[i].keep){
            newCaps.push(caps[i]);
            tarea = caps[i].area();
            if(tarea>largestCapArea){
                largestCapArea = tarea;
            }
            //totalCapArea = totalCapArea + caps[i].area();
        }
        else{
            caps[i].remove();
        }
    }

    caps = newCaps;

    if(largestCapArea>=(canvasArea*(0.75))){
    //if((totalCapArea)>=(piSqd*canvasArea)){
        globals.runSimulation = false;
        running = false;
        var endTime = Date.now();
        var totalTime = endTime - startTime;
        globals.simulationEnded(totalTime);
    }

}

/*
  Called by Paper.js framework up to 60 times per second.

  This is the primary function.
  If the simulation is running, or should start, it executes the process
   First it desorbs() i.e. all the atoms that have been there too long go away.
   Next ie deposits() i.e. add new atoms according to the calculated rate.
   Finally it executes the process, which does a lot (see comments)
*/
function onFrame(event){
     lastTime = lastTime + event.delta;
     if(lastTime >=timeStepSize){
        if(doRun()){

            //delete old dots
            desorb();

            ////add new dots
            deposit();

            process();

            lastTime = 0;
        }
     }
}
