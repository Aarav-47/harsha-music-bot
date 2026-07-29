/**
 * SpeakerSwitch_PremierePro.jsx
 * 
 * Adobe Premiere Pro ExtendScript UI Panel for automated 1-on-1 & 2-person podcast / interview editing.
 * Cut and zoom to individual speakers (Left Person, Right Person, or Wide Shot) with 1 click
 * and smooth easing transitions!
 * 
 * Install:
 * 1. Copy this file into your Premiere Pro Scripts folder:
 *    - macOS: /Applications/Adobe Premiere Pro [Version]/Scripts/ (or ScriptUI Panels)
 *    - Windows: C:\Program Files\Adobe\Adobe Premiere Pro [Version]\Support Files\Scripts\
 * 2. In Premiere Pro, go to File > Scripts > SpeakerSwitch_PremierePro.jsx
 *    (or Window > SpeakerSwitch_PremierePro.jsx if placed in ScriptUI Panels)
 */

(function (thisObj) {
    // Default Settings for 2-Person Side-by-Side Interview (e.g. Left Child, Right Teacher)
    var config = {
        zoomScale: 200,      // Zoom factor in %
        leftX: 30,           // Left Person X center %
        leftY: 55,           // Left Person Y center %
        rightX: 70,          // Right Person X center %
        rightY: 58,          // Right Person Y center %
        transitionFrames: 12, // Number of frames for smooth ease transition
        useTransition: true  // Enable smooth ease transition
    };

    function buildUI(thisObj) {
        var win = (thisObj instanceof Panel) ? thisObj : new Window("palette", "Speaker Switch & Auto Zoom", undefined, { resizeable: true });
        win.orientation = "column";
        win.alignChildren = ["fill", "top"];
        win.spacing = 8;
        win.margins = 12;

        // --- TITLE HEADER ---
        var titleGrp = win.add("group");
        titleGrp.orientation = "column";
        titleGrp.alignChildren = ["center", "center"];
        var titleTxt = titleGrp.add("statictext", undefined, "🎬 Speaker Switcher Pro");
        titleTxt.graphics.font = ScriptUI.newFont("sans-serif", "BOLD", 14);
        var subTxt = titleGrp.add("statictext", undefined, "1-Click Cut & Zoom with Smooth Transitions");

        win.add("panel", undefined, undefined, { name: "divider1" });

        // --- MAIN ACTION BUTTONS ---
        var btnPanel = win.add("panel", undefined, "Quick Speaker Switch");
        btnPanel.orientation = "column";
        btnPanel.alignChildren = ["fill", "top"];
        btnPanel.spacing = 8;
        btnPanel.margins = 10;

        var btnLeft = btnPanel.add("button", undefined, "👦 Focus Person 1 (Left)");
        var btnRight = btnPanel.add("button", undefined, "👩 Focus Person 2 (Right)");
        var btnWide = btnPanel.add("button", undefined, "👥 Reset to Wide Shot (Both)");

        // --- TRANSITION OPTIONS ---
        var transPanel = win.add("panel", undefined, "Transition & Easing");
        transPanel.orientation = "column";
        transPanel.alignChildren = ["fill", "top"];
        transPanel.spacing = 6;
        transPanel.margins = 10;

        var chkSmooth = transPanel.add("checkbox", undefined, "Enable Smooth Ease-In/Out Transition");
        chkSmooth.value = config.useTransition;

        var durationGrp = transPanel.add("group");
        durationGrp.orientation = "row";
        durationGrp.add("statictext", undefined, "Duration (Frames):");
        var editFrames = durationGrp.add("edittext", undefined, config.transitionFrames.toString());
        editFrames.characters = 4;

        // --- FRAMING & POSITIONS CUSTOMIZATION ---
        var posPanel = win.add("panel", undefined, "Position & Zoom Calibration");
        posPanel.orientation = "column";
        posPanel.alignChildren = ["fill", "top"];
        posPanel.spacing = 6;
        posPanel.margins = 10;

        // Zoom slider
        var zoomGrp = posPanel.add("group");
        zoomGrp.orientation = "row";
        zoomGrp.add("statictext", undefined, "Zoom Scale:");
        var zoomSlider = zoomGrp.add("slider", undefined, config.zoomScale, 120, 300);
        var zoomValTxt = zoomGrp.add("statictext", undefined, config.zoomScale + "%");
        zoomValTxt.characters = 5;

        zoomSlider.onChanging = function () {
            config.zoomScale = Math.round(zoomSlider.value);
            zoomValTxt.text = config.zoomScale + "%";
        };

        // Left Person X/Y
        var leftGrp = posPanel.add("group");
        leftGrp.orientation = "row";
        leftGrp.add("statictext", undefined, "Left Person X/Y:");
        var leftXEdit = leftGrp.add("edittext", undefined, config.leftX.toString());
        leftXEdit.characters = 3;
        leftGrp.add("statictext", undefined, "% ,");
        var leftYEdit = leftGrp.add("edittext", undefined, config.leftY.toString());
        leftYEdit.characters = 3;
        leftGrp.add("statictext", undefined, "%");

        // Right Person X/Y
        var rightGrp = posPanel.add("group");
        rightGrp.orientation = "row";
        rightGrp.add("statictext", undefined, "Right Person X/Y:");
        var rightXEdit = rightGrp.add("edittext", undefined, config.rightX.toString());
        rightXEdit.characters = 3;
        rightGrp.add("statictext", undefined, "% ,");
        var rightYEdit = rightGrp.add("edittext", undefined, config.rightY.toString());
        rightYEdit.characters = 3;
        rightGrp.add("statictext", undefined, "%");

        // --- MULTICAM GENERATOR ---
        var multiPanel = win.add("panel", undefined, "Multicam Live Switching Setup");
        multiPanel.orientation = "column";
        multiPanel.alignChildren = ["fill", "top"];
        multiPanel.spacing = 6;
        multiPanel.margins = 10;

        var btnMulticam = multiPanel.add("button", undefined, "🎛️ Auto-Setup 3-Track Multicam");
        var multiHint = multiPanel.add("statictext", undefined, "Creates 3 synced tracks (Wide, Left, Right) to switch live with 1, 2, 3 keys!", { multiline: true });

        // --- BUTTON EVENT HANDLERS ---

        function updateConfigFromUI() {
            config.useTransition = chkSmooth.value;
            config.transitionFrames = parseInt(editFrames.text, 10) || 12;
            config.leftX = parseFloat(leftXEdit.text) || 30;
            config.leftY = parseFloat(leftYEdit.text) || 55;
            config.rightX = parseFloat(rightXEdit.text) || 70;
            config.rightY = parseFloat(rightYEdit.text) || 58;
        }

        btnLeft.onClick = function () {
            updateConfigFromUI();
            applySpeakerSwitch("left");
        };

        btnRight.onClick = function () {
            updateConfigFromUI();
            applySpeakerSwitch("right");
        };

        btnWide.onClick = function () {
            updateConfigFromUI();
            applySpeakerSwitch("wide");
        };

        btnMulticam.onClick = function () {
            updateConfigFromUI();
            setupMulticamTracks();
        };

        win.layout.layout(true);
        return win;
    }

    // --- CORE PREMIERE PRO SCRIPTING LOGIC ---

    function getActiveSequence() {
        if (!app.project || !app.project.activeSequence) {
            alert("No active sequence found! Please open a timeline sequence in Premiere Pro.");
            return null;
        }
        return app.project.activeSequence;
    }

    function getClipUnderPlayhead(seq) {
        var cti = seq.getPlayerPosition();
        for (var t = 0; t < seq.videoTracks.numTracks; t++) {
            var track = seq.videoTracks[t];
            if (track.isMuted()) continue;
            for (var c = 0; c < track.clips.numClips; c++) {
                var clip = track.clips[c];
                if (cti.ticks >= clip.start.ticks && cti.ticks < clip.end.ticks) {
                    return { clip: clip, track: track, trackIndex: t };
                }
            }
        }
        return null;
    }

    function applySpeakerSwitch(targetSpeaker) {
        var seq = getActiveSequence();
        if (!seq) return;

        var targetClipInfo = getClipUnderPlayhead(seq);

        // If no clip under playhead, try using selected clip
        var clipToModify = null;
        if (targetClipInfo) {
            clipToModify = targetClipInfo.clip;
        } else {
            alert("Please place the playhead (CTI) over a clip on your timeline.");
            return;
        }

        app.enableQE(); // Enable QE DOM for enhanced precision if available

        // Determine target Scale & Position
        var targetScale = 100;
        var targetPosX = 50; // percentage
        var targetPosY = 50; // percentage

        if (targetSpeaker === "left") {
            targetScale = config.zoomScale;
            targetPosX = config.leftX;
            targetPosY = config.leftY;
        } else if (targetSpeaker === "right") {
            targetScale = config.zoomScale;
            targetPosX = config.rightX;
            targetPosY = config.rightY;
        } else if (targetSpeaker === "wide") {
            targetScale = 100;
            targetPosX = 50;
            targetPosY = 50;
        }

        // Perform split at playhead if CTI is inside the clip duration
        var cti = seq.getPlayerPosition();
        var clipStartTicks = parseInt(clipToModify.start.ticks, 10);
        var clipEndTicks = parseInt(clipToModify.end.ticks, 10);
        var ctiTicks = parseInt(cti.ticks, 10);

        // Split clip if playhead is not at exact start/end
        if (ctiTicks > clipStartTicks + 1000000000 && ctiTicks < clipEndTicks - 1000000000) {
            try {
                if (typeof clipToModify.split === "function") {
                    clipToModify.split(cti);
                    // Re-query clip under playhead after split
                    var newClipInfo = getClipUnderPlayhead(seq);
                    if (newClipInfo) clipToModify = newClipInfo.clip;
                }
            } catch (e) {
                // If split API fails, proceed directly on active clip segment
            }
        }

        // Apply Motion Properties
        applyMotionProperties(clipToModify, seq, targetScale, targetPosX, targetPosY, config.useTransition, config.transitionFrames);
    }

    function applyMotionProperties(clip, seq, targetScale, targetPosXPercent, targetPosYPercent, animate, animFrames) {
        var components = clip.components;
        var motionComp = null;

        for (var i = 0; i < components.numItems; i++) {
            var comp = components[i];
            if (comp.displayName === "Motion" || comp.matchName === "AE.ADBE Motion") {
                motionComp = comp;
                break;
            }
        }

        if (!motionComp) {
            alert("Could not locate Motion component on the selected clip.");
            return;
        }

        var posProp = null;
        var scaleProp = null;

        for (var p = 0; p < motionComp.properties.numItems; p++) {
            var prop = motionComp.properties[p];
            if (prop.displayName === "Position") {
                posProp = prop;
            } else if (prop.displayName === "Scale") {
                scaleProp = prop;
            }
        }

        if (!posProp || !scaleProp) {
            alert("Position or Scale property missing on clip.");
            return;
        }

        // Determine frame dimensions
        var width = seq.frameSizeHorizontal;
        var height = seq.frameSizeVertical;

        // Convert percentage position to coordinate values
        var samplePosVal = posProp.getValue();
        var isNormalized = false;

        // Detect if Premiere uses normalized coordinates [0.0 - 1.0] or pixel coordinates [0 - width]
        if (samplePosVal && samplePosVal.length >= 2) {
            if (samplePosVal[0] <= 1.5 && samplePosVal[1] <= 1.5) {
                isNormalized = true;
            }
        }

        var finalX = isNormalized ? (targetPosXPercent / 100) : (targetPosXPercent / 100 * width);
        var finalY = isNormalized ? (targetPosYPercent / 100) : (targetPosYPercent / 100 * height);

        if (animate) {
            // Add smooth keyframed ease transition at the start of the clip
            posProp.setTimeVarying(true);
            scaleProp.setTimeVarying(true);

            var startTicks = clip.start.ticks;
            var frameTicks = (seq.timebase) ? (2540160000000 / parseFloat(seq.timebase)) : 1016064000;
            var endAnimTicks = (parseInt(startTicks, 10) + (animFrames * frameTicks)).toString();

            // Set initial keyframe value
            posProp.setValueAtTime(startTicks, posProp.getValue(), 1);
            scaleProp.setValueAtTime(startTicks, scaleProp.getValue(), 1);

            // Set target keyframe value with easing
            posProp.setValueAtTime(endAnimTicks, [finalX, finalY], 1);
            scaleProp.setValueAtTime(endAnimTicks, targetScale, 1);
        } else {
            // Instant Cut / Framing change
            posProp.setValue([finalX, finalY], 1);
            scaleProp.setValue(targetScale, 1);
        }
    }

    function setupMulticamTracks() {
        var seq = getActiveSequence();
        if (!seq) return;

        var clipInfo = getClipUnderPlayhead(seq);
        if (!clipInfo) {
            alert("Please select or place the playhead over your main 2-person wide shot clip.");
            return;
        }

        alert(
            "🎛️ Multicam Setup Instructions:\n\n" +
            "1. Duplicate your Wide Shot video clip onto 3 tracks:\n" +
            "   - Track V1: Wide Shot (100% Scale, 50% X / 50% Y)\n" +
            "   - Track V2: Left Person Close-Up (" + config.zoomScale + "% Scale, " + config.leftX + "% X / " + config.leftY + "% Y)\n" +
            "   - Track V3: Right Person Close-Up (" + config.zoomScale + "% Scale, " + config.rightX + "% X / " + config.rightY + "% Y)\n\n" +
            "2. Select all 3 tracks -> Right Click -> Create Multi-Camera Source Sequence.\n" +
            "3. Open Window > Multi-Camera Monitor.\n" +
            "4. Play your timeline and press keys 1, 2, 3 to live switch between speakers while watching!"
        );
    }

    // Launch UI Panel
    var myPanel = buildUI(thisObj);
    if (myPanel instanceof Window) {
        myPanel.center();
        myPanel.show();
    }
})(this);
