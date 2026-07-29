/**
 * BulkMediaToComp.jsx
 * 
 * An Adobe After Effects script to automatically:
 * 1. Import and sequence/stack media files in a single composition.
 * 2. Distribute individual media files across multiple placeholder compositions in bulk (1-to-1 matching).
 * 
 * Install:
 * Place this file in your After Effects installation folder:
 * Support Files/Scripts/ScriptUI Panels/
 * 
 * Run:
 * From After Effects, go to Window > BulkMediaToComp.jsx (if installed as a panel)
 * or File > Scripts > Run Script File... (to run once)
 */

(function(thisObj) {
    // -------------------------------------------------------------
    // Core Logic & Helper Functions
    // -------------------------------------------------------------

    /**
     * Checks if a file extension is media supported by this script
     */
    function isValidExtension(ext) {
        var validExts = {
            // Videos
            "mp4": true, "mov": true, "avi": true, "mkv": true, "m4v": true, 
            "mpg": true, "mpeg": true, "wmv": true, "flv": true, "webm": true,
            // Images
            "png": true, "jpg": true, "jpeg": true, "gif": true, "tif": true, 
            "tiff": true, "psd": true, "ai": true, "tga": true, "exr": true,
            // Audio
            "mp3": true, "wav": true, "aac": true, "m4a": true, "aif": true, 
            "aiff": true
        };
        return validExts[ext.toLowerCase()] === true;
    }

    /**
     * Check if a layer has a visual source component (video/image/comp)
     */
    function isVisualLayer(layer) {
        if (layer.source && (layer.source instanceof FootageItem || layer.source instanceof CompItem)) {
            if (layer.source instanceof FootageItem) {
                return layer.source.hasVideo;
            }
            return true; // CompItems have visual content
        }
        return false;
    }

    /**
     * Recursively list files inside a directory matching media filters
     */
    function getMediaFilesFromFolder(folder, filesArray) {
        var items = folder.getFiles();
        for (var i = 0; i < items.length; i++) {
            var item = items[i];
            if (item instanceof File) {
                var ext = item.name.split('.').pop();
                if (ext && isValidExtension(ext)) {
                    filesArray.push(item);
                }
            } else if (item instanceof Folder) {
                getMediaFilesFromFolder(item, filesArray);
            }
        }
    }

    /**
     * Get the hierarchy path of a FolderItem
     */
    function getFolderPath(folderItem) {
        var path = folderItem.name;
        var parent = folderItem.parentFolder;
        while (parent && parent !== app.project.rootFolder) {
            path = parent.name + "/" + path;
            parent = parent.parentFolder;
        }
        return path;
    }

    /**
     * Helper to recursively scan folders
     */
    function scanFoldersRecursively(currentFolder, foldersList) {
        for (var i = 1; i <= currentFolder.numItems; i++) {
            var item = currentFolder.item(i);
            if (item instanceof FolderItem) {
                foldersList.push({
                    name: getFolderPath(item),
                    item: item
                });
                scanFoldersRecursively(item, foldersList);
            }
        }
    }

    /**
     * Get all folders in the project panel (including nested ones)
     */
    function getProjectFolders() {
        var foldersList = [];
        if (app.project && app.project.rootFolder) {
            scanFoldersRecursively(app.project.rootFolder, foldersList);
        }
        return foldersList;
    }

    /**
     * Recursively list compositions inside a FolderItem
     */
    function getCompositionsFromFolder(folderItem, compsArray) {
        for (var i = 1; i <= folderItem.numItems; i++) {
            var subItem = folderItem.item(i);
            if (subItem instanceof CompItem) {
                compsArray.push(subItem);
            } else if (subItem instanceof FolderItem) {
                getCompositionsFromFolder(subItem, compsArray);
            }
        }
    }

    /**
     * Scaler helper function to scale layer to fit target composition
     */
    function scaleLayerToComp(layer, targetComp, scaleMode) {
        if (isVisualLayer(layer) && scaleMode !== "none") {
            var itemW = layer.source.width;
            var itemH = layer.source.height;
            var scaleX = (targetComp.width / itemW) * 100;
            var scaleY = (targetComp.height / itemH) * 100;
            var finalScaleX = 100;
            var finalScaleY = 100;

            if (scaleMode === "fit") {
                var minScale = Math.min(scaleX, scaleY);
                finalScaleX = minScale;
                finalScaleY = minScale;
            } else if (scaleMode === "fill") {
                var maxScale = Math.max(scaleX, scaleY);
                finalScaleX = maxScale;
                finalScaleY = maxScale;
            } else if (scaleMode === "stretch") {
                finalScaleX = scaleX;
                finalScaleY = scaleY;
            }

            var scaleProp = layer.property("ADBE Transform Group").property("ADBE Scale");
            if (scaleProp) {
                scaleProp.setValue([finalScaleX, finalScaleY, 100]);
            }
        }
    }

    /**
     * Gather media items from selected source (Folder or Project Selection)
     */
    function gatherMediaItems(settings, ui, importFolder) {
        var items = [];
        if (settings.sourceMode === "folder") {
            if (!settings.folderPath) {
                return null;
            }
            var folder = new Folder(settings.folderPath);
            if (!folder.exists) {
                return null;
            }
            var files = [];
            getMediaFilesFromFolder(folder, files);
            if (files.length === 0) {
                return [];
            }

            for (var i = 0; i < files.length; i++) {
                try {
                    var importOptions = new ImportOptions(files[i]);
                    var importedItem = app.project.importFile(importOptions);
                    if (importedItem) {
                        if (importFolder) {
                            importedItem.parentFolder = importFolder;
                        }
                        items.push(importedItem);
                    }
                } catch (e) {
                    // Ignore import errors and continue
                }
            }
        } else {
            var selection = app.project.selection;
            if (selection) {
                for (var j = 0; j < selection.length; j++) {
                    var selItem = selection[j];
                    if (selItem && (selItem instanceof FootageItem || selItem instanceof CompItem)) {
                        items.push(selItem);
                    }
                }
            }
        }
        return items;
    }

    // -------------------------------------------------------------
    // WORKFLOW 1: Assemble into Single Composition
    // -------------------------------------------------------------

    function runAssembleWorkflow(settings, ui) {
        ui.statusText.text = "Gathering media...";
        ui.progressBar.value = 10;


        var importFolder = null;
        if (settings.sourceMode === "folder" && settings.createProjectFolder) {
            app.beginUndoGroup("Create Import Folder");
            importFolder = app.project.items.addFolder("Bulk Imports - " + new Date().toLocaleTimeString());
            app.endUndoGroup();
        }

        var rawItems = gatherMediaItems(settings, ui, importFolder);
        if (!rawItems) {
            alert("Please select a valid source folder first.");
            return;
        }
        
        var itemsToProcess = [];
        for (var iClean = 0; iClean < rawItems.length; iClean++) {
            if (rawItems[iClean]) {
                itemsToProcess.push(rawItems[iClean]);
            }
        }
        if (itemsToProcess.length === 0) {
            alert("No valid media files found.");
            return;
        }
 
        // Sort items
        if (settings.sortMode === "asc") {
            itemsToProcess.sort(function(a, b) { 
                var nameA = (a && a.name) ? a.name : "";
                var nameB = (b && b.name) ? b.name : "";
                return nameA.localeCompare(nameB); 
            });
        } else if (settings.sortMode === "desc") {
            itemsToProcess.sort(function(a, b) { 
                var nameA = (a && a.name) ? a.name : "";
                var nameB = (b && b.name) ? b.name : "";
                return nameB.localeCompare(nameA); 
            });
        }

        var targetComp = null;
        app.beginUndoGroup("Assemble Media to Comp");

        if (settings.targetMode === "active") {
            targetComp = app.project.activeItem;
            if (!targetComp || !(targetComp instanceof CompItem)) {
                app.endUndoGroup();
                alert("Please open/select an active composition first, or choose 'Create New Composition'.");
                return;
            }
        } else {
            var compWidth = settings.compWidth;
            var compHeight = settings.compHeight;
            var compFrameRate = settings.compFPS;
            var firstVisual = null;

            for (var k = 0; k < itemsToProcess.length; k++) {
                var it = itemsToProcess[k];
                if (it.width && it.height) {
                    firstVisual = it;
                    break;
                }
            }

            if (settings.matchFirstItem && firstVisual) {
                compWidth = firstVisual.width;
                compHeight = firstVisual.height;
                compFrameRate = firstVisual.frameRate || compFrameRate;
            }

            var estimatedDuration = 0;
            if (settings.layoutMode === "stack") {
                for (var m = 0; m < itemsToProcess.length; m++) {
                    var dur = itemsToProcess[m].still ? settings.stillDuration : itemsToProcess[m].duration;
                    if (dur > estimatedDuration) estimatedDuration = dur;
                }
            } else {
                for (var n = 0; n < itemsToProcess.length; n++) {
                    var itemDur = itemsToProcess[n].still ? settings.stillDuration : itemsToProcess[n].duration;
                    if (itemDur === 0 || itemsToProcess[n].still) {
                        itemDur = settings.stillDuration;
                    }
                    estimatedDuration += itemDur;
                    if (n > 0) {
                        estimatedDuration -= settings.overlap;
                    }
                }
            }
            estimatedDuration = Math.max(10, estimatedDuration + 5);

            targetComp = app.project.items.addComp(
                settings.compName || "Bulk Media Comp",
                compWidth, compHeight, 1.0, estimatedDuration, compFrameRate
            );
        }

        targetComp.openInViewer();

        var currentTime = (settings.targetMode === "active") ? targetComp.time : 0;
        var addedLayers = [];

        ui.statusText.text = "Placing layers...";
        ui.progressBar.value = 50;


        for (var p = 0; p < itemsToProcess.length; p++) {
            var item = itemsToProcess[p];
            if (item) {
                var layer = targetComp.layers.add(item);
                if (layer) {
                    addedLayers.push(layer);
                    
                    if (item.still || item.duration === 0) {
                        layer.outPoint = layer.inPoint + settings.stillDuration;
                    }
                    
                    scaleLayerToComp(layer, targetComp, settings.scaleMode);
                }
            }
 
            var itemProg = 50 + ((p / itemsToProcess.length) * 30);
            ui.progressBar.value = itemProg;
    
        }

        ui.statusText.text = "Arranging timeline...";
        ui.progressBar.value = 80;


        for (var q = 0; q < addedLayers.length; q++) {
            var currLayer = addedLayers[q];

            if (settings.layoutMode === "stack") {
                var shift = currentTime - currLayer.inPoint;
                currLayer.startTime += shift;
            } else {
                var sequenceShift = currentTime - currLayer.inPoint;
                currLayer.startTime += sequenceShift;

                if (settings.addDissolve && settings.overlap > 0 && q > 0) {
                    var opacityProp = currLayer.property("ADBE Transform Group").property("ADBE Opacity");
                    if (opacityProp) {
                        opacityProp.setValueAtTime(currLayer.inPoint, 0);
                        opacityProp.setValueAtTime(currLayer.inPoint + settings.overlap, 100);
                    }
                }

                currentTime = currLayer.outPoint - settings.overlap;
            }
        }

        if (settings.targetMode === "new") {
            var lastOutPoint = 0;
            for (var r = 0; r < addedLayers.length; r++) {
                if (addedLayers[r].outPoint > lastOutPoint) {
                    lastOutPoint = addedLayers[r].outPoint;
                }
            }
            if (lastOutPoint > 0) {
                targetComp.duration = lastOutPoint;
            }
        }

        app.endUndoGroup();

        ui.progressBar.value = 100;
        ui.statusText.text = "Success! " + itemsToProcess.length + " items assembled.";

    }

    // -------------------------------------------------------------
    // WORKFLOW 2: Batch Place into Multiple Compositions (1-to-1)
    // -------------------------------------------------------------

    function runBatchPlaceWorkflow(settings, ui) {
        // 1. Gather Target Compositions
        var targetComps = [];
        if (settings.batchTargetMode === "folder") {
            var folderItem = settings.batchTargetFolderItem;
            if (!folderItem || !(folderItem instanceof FolderItem)) {
                alert("Please select a target Project Folder in the dropdown first (or click 'Refresh' to scan folders).");
                return;
            }
            getCompositionsFromFolder(folderItem, targetComps);
            if (targetComps.length === 0) {
                alert("No compositions found inside the selected Project Folder: '" + folderItem.name + "'.");
                return;
            }
        } else {
            var selection = app.project.selection;
            for (var i = 0; i < selection.length; i++) {
                if (selection[i] instanceof CompItem) {
                    targetComps.push(selection[i]);
                }
            }
            if (targetComps.length === 0) {
                alert("Please select one or more compositions in the Project Panel.");
                return;
            }
        }

        // 2. Gather Media Items
        ui.statusText.text = "Gathering media...";
        ui.progressBar.value = 10;


        var importFolder = null;
        if (settings.sourceMode === "folder" && settings.createProjectFolder) {
            app.beginUndoGroup("Create Batch Import Folder");
            importFolder = app.project.items.addFolder("Batch Place Imports - " + new Date().toLocaleTimeString());
            app.endUndoGroup();
        }

        var rawMediaItems = gatherMediaItems(settings, ui, importFolder);
        if (!rawMediaItems) {
            alert("Selected media source folder does not exist or has no files.");
            return;
        }
        var mediaItems = [];
        for (var mClean = 0; mClean < rawMediaItems.length; mClean++) {
            if (rawMediaItems[mClean]) {
                mediaItems.push(rawMediaItems[mClean]);
            }
        }
        if (mediaItems.length === 0) {
            alert("No valid media files found.");
            return;
        }

        // 3. Match Target Compositions and Media
        ui.statusText.text = "Matching media to compositions...";
        ui.progressBar.value = 30;


        var matches = [];
        if (settings.batchMatchMode === "name") {
            for (var c = 0; c < targetComps.length; c++) {
                var comp = targetComps[c];
                var compNameNorm = comp.name.toLowerCase().replace(/[\s_-]+/g, "");
                var foundMatch = null;
                for (var m = 0; m < mediaItems.length; m++) {
                    var med = mediaItems[m];
                    if (!med) continue;
                    var medNameNorm = med.name.toLowerCase().replace(/[\s_-]+/g, "");
                    var extIndex = medNameNorm.lastIndexOf(".");
                    if (extIndex !== -1) {
                        medNameNorm = medNameNorm.substring(0, extIndex);
                    }
                    if (medNameNorm.indexOf(compNameNorm) !== -1 || compNameNorm.indexOf(medNameNorm) !== -1) {
                        foundMatch = med;
                        break;
                    }
                }
                if (foundMatch) {
                    matches.push({ comp: comp, item: foundMatch });
                }
            }
        } else if (settings.batchMatchMode === "shuffle") {
            // Shuffle media randomly using Fisher-Yates
            var shuffled = [];
            for (var sc = 0; sc < mediaItems.length; sc++) {
                shuffled.push(mediaItems[sc]);
            }
            for (var si = shuffled.length - 1; si > 0; si--) {
                var sj = Math.floor(Math.random() * (si + 1));
                var tmp = shuffled[si];
                shuffled[si] = shuffled[sj];
                shuffled[sj] = tmp;
            }
            
            var totalCompsS = targetComps.length;
            var totalMediaS = shuffled.length;
            
            var matchCountS = settings.batchLoopMedia ? totalCompsS : Math.min(totalCompsS, totalMediaS);
            for (var js = 0; js < matchCountS; js++) {
                matches.push({ comp: targetComps[js], item: shuffled[js % totalMediaS] });
            }
        } else {
            // Sort alphabetically for Sort & Pair
            targetComps.sort(function(a, b) { 
                var nameA = (a && a.name) ? a.name : "";
                var nameB = (b && b.name) ? b.name : "";
                return nameA.localeCompare(nameB); 
            });
            mediaItems.sort(function(a, b) { 
                var nameA = (a && a.name) ? a.name : "";
                var nameB = (b && b.name) ? b.name : "";
                return nameA.localeCompare(nameB); 
            });
            
            var totalComps = targetComps.length;
            var totalMedia = mediaItems.length;
            
            var matchCount = settings.batchLoopMedia ? totalComps : Math.min(totalComps, totalMedia);
            for (var j = 0; j < matchCount; j++) {
                matches.push({ comp: targetComps[j], item: mediaItems[j % totalMedia] });
            }
        }

        if (matches.length === 0) {
            alert("No composition and media matches were found. Verify that compositions and footages are selected or match in name.");
            return;
        }

        // 4. Execute Placement
        ui.statusText.text = "Placing media...";
        ui.progressBar.value = 50;


        app.beginUndoGroup("Batch Place Media 1-to-1");
        
        var useCount = {}; // Map to track how many times a media ID is used
        
        for (var k = 0; k < matches.length; k++) {
            var match = matches[k];
            var comp = match.comp;
            var mediaItem = match.item;
            if (!comp || !mediaItem) continue;
 
            // Track usage count
            var itemId = mediaItem.id;
            if (!useCount[itemId]) {
                useCount[itemId] = 0;
            }
            useCount[itemId]++;
 
            // Clear layers if requested
            if (settings.batchClearLayers) {
                while (comp.layers.length > 0) {
                    comp.layers[1].remove();
                }
            }
 
            // Place layer
            var newLayer = comp.layers.add(mediaItem);
            if (newLayer) {
                // Stack order position
                if (settings.batchStackPosition === "bottom") {
                    newLayer.moveToEnd();
                }
                
                // Sync duration
                var itemDur = (mediaItem.still || mediaItem.duration === 0) ? settings.stillDuration : mediaItem.duration;
                if (settings.batchSyncDuration) {
                    comp.duration = itemDur;
                    newLayer.outPoint = newLayer.inPoint + itemDur;
                } else if (mediaItem.still || mediaItem.duration === 0) {
                    newLayer.outPoint = newLayer.inPoint + settings.stillDuration;
                }
                
                // Apply Random Start Offset (for ALL placements when enabled, not just repeated)
                if (settings.batchRandomOffset && !mediaItem.still && mediaItem.duration > 0) {
                    var compDur = comp.duration;
                    if (mediaItem.duration > compDur) {
                        var maxOffset = mediaItem.duration - compDur;
                        var randomOffset = Math.random() * maxOffset;
                        newLayer.startTime = -randomOffset;
                        newLayer.inPoint = 0;
                        newLayer.outPoint = compDur;
                    }
                }
                
                // Apply Scaling
                scaleLayerToComp(newLayer, comp, settings.scaleMode);
            }

            var prog = 50 + ((k / matches.length) * 50);
            ui.progressBar.value = prog;
    
        }
        app.endUndoGroup();

        ui.progressBar.value = 100;
        ui.statusText.text = "Success! Placed media in " + matches.length + " comps.";

    }

    // -------------------------------------------------------------
    // UI Layout (ScriptUI)
    // -------------------------------------------------------------

    function buildUI(thisObj) {
        var myPanel = (thisObj instanceof Panel) ? thisObj : new Window("palette", "Bulk Media to Comp", undefined, {resizeable: true});
        
        myPanel.orientation = "column";
        myPanel.alignChildren = ["fill", "top"];
        myPanel.spacing = 8;
        myPanel.margins = 10;

        // TOP MODE SELECTOR
        var modeGrp = myPanel.add("group");
        modeGrp.orientation = "row";
        modeGrp.spacing = 5;
        modeGrp.add("statictext", undefined, "Workflow Mode:");
        var ddlMode = modeGrp.add("dropdownlist", undefined, ["Assemble into Single Comp", "Batch Place (1-to-1 into Comps)"]);
        ddlMode.alignment = ["fill", "center"];

        // PANEL 1: SOURCE MEDIA
        var sourcePanel = myPanel.add("panel", undefined, "1. Source Media");
        sourcePanel.orientation = "column";
        sourcePanel.alignChildren = ["fill", "top"];
        sourcePanel.spacing = 6;
        sourcePanel.margins = 8;

        var sourceGrp = sourcePanel.add("group");
        sourceGrp.orientation = "row";
        sourceGrp.spacing = 10;
        var rdoFolder = sourceGrp.add("radiobutton", undefined, "Local Folder");
        var rdoSelection = sourceGrp.add("radiobutton", undefined, "Project Panel Selection");
        rdoFolder.value = true;

        var folderSelectGrp = sourcePanel.add("group");
        folderSelectGrp.orientation = "row";
        folderSelectGrp.spacing = 8;
        var btnChooseFolder = folderSelectGrp.add("button", undefined, "Choose Folder...");
        var lblFolderPath = folderSelectGrp.add("statictext", undefined, "No folder selected", {truncate: "middle"});
        lblFolderPath.alignment = ["fill", "center"];
        lblFolderPath.preferredSize.width = 150;

        var chkCreateProjFolder = sourcePanel.add("checkbox", undefined, "Organize folder imports in project folder");
        chkCreateProjFolder.value = true;

        // PANEL 2: TARGET COMPOSITION (Assemble Mode Only)
        var targetPanel = myPanel.add("panel", undefined, "2. Target Composition Settings");
        targetPanel.orientation = "column";
        targetPanel.alignChildren = ["fill", "top"];
        targetPanel.spacing = 6;
        targetPanel.margins = 8;

        var targetGrp = targetPanel.add("group");
        targetGrp.orientation = "row";
        targetGrp.spacing = 10;
        var rdoActiveComp = targetGrp.add("radiobutton", undefined, "Active Composition");
        var rdoNewComp = targetGrp.add("radiobutton", undefined, "Create New Composition");
        rdoNewComp.value = true;

        var newCompSettings = targetPanel.add("group");
        newCompSettings.orientation = "column";
        newCompSettings.alignChildren = ["fill", "top"];
        newCompSettings.spacing = 5;

        var nameGrp = newCompSettings.add("group");
        nameGrp.add("statictext", undefined, "Comp Name:");
        var txtCompName = nameGrp.add("edittext", undefined, "Bulk Media Comp");
        txtCompName.alignment = ["fill", "center"];

        var resolutionGrp = newCompSettings.add("group");
        resolutionGrp.orientation = "row";
        resolutionGrp.spacing = 8;
        var chkMatchFirst = resolutionGrp.add("checkbox", undefined, "Match 1st Item's Size");
        chkMatchFirst.value = true;

        var dimGrp = resolutionGrp.add("group");
        dimGrp.spacing = 5;
        var txtWidth = dimGrp.add("edittext", undefined, "1920");
        txtWidth.preferredSize.width = 45;
        dimGrp.add("statictext", undefined, "x");
        var txtHeight = dimGrp.add("edittext", undefined, "1080");
        txtHeight.preferredSize.width = 45;

        var settingsRow = newCompSettings.add("group");
        settingsRow.orientation = "row";
        settingsRow.spacing = 15;

        var fpsGrp = settingsRow.add("group");
        fpsGrp.add("statictext", undefined, "Frame Rate:");
        var txtFPS = fpsGrp.add("edittext", undefined, "30");
        txtFPS.preferredSize.width = 30;

        var stillGrp = settingsRow.add("group");
        stillGrp.add("statictext", undefined, "Still Image Dur (s):");
        var txtStillDur = stillGrp.add("edittext", undefined, "5.0");
        txtStillDur.preferredSize.width = 35;

        // PANEL 3: TIMELINE & LAYOUT (Assemble Mode Only)
        var layoutPanel = myPanel.add("panel", undefined, "3. Layout & Timeline");
        layoutPanel.orientation = "column";
        layoutPanel.alignChildren = ["fill", "top"];
        layoutPanel.spacing = 6;
        layoutPanel.margins = 8;

        var layoutGrp = layoutPanel.add("group");
        layoutGrp.orientation = "row";
        layoutGrp.spacing = 10;
        var rdoSequence = layoutGrp.add("radiobutton", undefined, "Sequence Layers");
        var rdoStack = layoutGrp.add("radiobutton", undefined, "Stack Layers");
        rdoSequence.value = true;

        var sequenceSettings = layoutPanel.add("group");
        sequenceSettings.orientation = "row";
        sequenceSettings.spacing = 15;
        
        var overlapGrp = sequenceSettings.add("group");
        overlapGrp.add("statictext", undefined, "Overlap / Gap (s):");
        var txtOverlap = overlapGrp.add("edittext", undefined, "0.0");
        txtOverlap.preferredSize.width = 35;

        var chkDissolve = sequenceSettings.add("checkbox", undefined, "Cross Dissolve");
        chkDissolve.value = false;

        // PANEL 4: BATCH PLACE SETTINGS (Batch Place Mode Only)
        var batchPanel = myPanel.add("panel", undefined, "2. Batch Place (1-to-1) Settings");
        batchPanel.orientation = "column";
        batchPanel.alignChildren = ["fill", "top"];
        batchPanel.spacing = 6;
        batchPanel.margins = 8;
        batchPanel.visible = false; // Hidden by default

        var batchTargetGrp = batchPanel.add("group");
        batchTargetGrp.orientation = "row";
        batchTargetGrp.spacing = 10;
        var rdoBatchSelComps = batchTargetGrp.add("radiobutton", undefined, "Selected Compositions");
        var rdoBatchFolderComps = batchTargetGrp.add("radiobutton", undefined, "Compositions in Folder");
        rdoBatchSelComps.value = true;

        var batchFolderSelectGrp = batchPanel.add("group");
        batchFolderSelectGrp.orientation = "row";
        batchFolderSelectGrp.spacing = 8;
        batchFolderSelectGrp.add("statictext", undefined, "Select Folder:");
        var ddlTargetFolder = batchFolderSelectGrp.add("dropdownlist", undefined, []);
        ddlTargetFolder.alignment = ["fill", "center"];
        var btnRefreshFolders = batchFolderSelectGrp.add("button", undefined, "Refresh");
        btnRefreshFolders.preferredSize.width = 55;
        
        batchFolderSelectGrp.visible = false;
        batchFolderSelectGrp.maximumSize = [0, 0];
        batchFolderSelectGrp.preferredSize = [0, 0];

        var batchMatchGrp = batchPanel.add("group");
        batchMatchGrp.orientation = "row";
        batchMatchGrp.spacing = 5;
        batchMatchGrp.add("statictext", undefined, "Matching Method:");
        var ddlMatch = batchMatchGrp.add("dropdownlist", undefined, ["Sort & Pair (Alphabetical)", "Name Match (Media name contains Comp name)", "Shuffle (Random)"]);
        ddlMatch.selection = 0;
        ddlMatch.alignment = ["fill", "center"];

        var batchOptionsGrp = batchPanel.add("group");
        batchOptionsGrp.orientation = "column";
        batchOptionsGrp.alignChildren = ["fill", "top"];
        batchOptionsGrp.spacing = 4;

        var chkClearLayers = batchOptionsGrp.add("checkbox", undefined, "Clear existing layers in target comps");
        chkClearLayers.value = false;

        var chkSyncDuration = batchOptionsGrp.add("checkbox", undefined, "Match composition duration to video duration");
        chkSyncDuration.value = true;

        var chkLoopMedia = batchOptionsGrp.add("checkbox", undefined, "Loop / repeat media if comps exceed media");
        chkLoopMedia.value = true;

        var chkRandomOffset = batchOptionsGrp.add("checkbox", undefined, "Randomize start offset for repeated video clips");
        chkRandomOffset.value = true;

        var batchStillGrp = batchPanel.add("group");
        batchStillGrp.add("statictext", undefined, "Still Image Dur (s):");
        var txtBatchStillDur = batchStillGrp.add("edittext", undefined, "5.0");
        txtBatchStillDur.preferredSize.width = 35;

        var batchPosGrp = batchPanel.add("group");
        batchPosGrp.add("statictext", undefined, "Layer Stack Position:");
        var ddlPosition = batchPosGrp.add("dropdownlist", undefined, ["Top of Stack", "Bottom of Stack"]);
        ddlPosition.selection = 0;

        // PANEL 5: TRANSFORM & SORTING (Shared)
        var transformPanel = myPanel.add("panel", undefined, "4. Scaling & Sorting");
        transformPanel.orientation = "column";
        transformPanel.alignChildren = ["fill", "top"];
        transformPanel.spacing = 6;
        transformPanel.margins = 8;

        var scalingRow = transformPanel.add("group");
        scalingRow.add("statictext", undefined, "Scaling Option:");
        var ddlScale = scalingRow.add("dropdownlist", undefined, ["Original Size", "Fit Comp (Proportional)", "Fill Comp (Crop)", "Stretch to Fit"]);
        ddlScale.selection = 1;
        ddlScale.alignment = ["fill", "center"];

        var sortingRow = transformPanel.add("group");
        var lblSorting = sortingRow.add("statictext", undefined, "Sort Footages:");
        var ddlSort = sortingRow.add("dropdownlist", undefined, ["No Sort (Use selection order)", "Alphabetical (A-Z)", "Alphabetical (Z-A)"]);
        ddlSort.selection = 1;
        ddlSort.alignment = ["fill", "center"];

        // RUN SECTION
        var actionGrp = myPanel.add("group");
        actionGrp.orientation = "column";
        actionGrp.alignChildren = ["fill", "center"];
        actionGrp.spacing = 5;

        var btnRun = actionGrp.add("button", undefined, "Import & Arrange Media");
        btnRun.preferredSize.height = 32;

        var progressGrp = actionGrp.add("group");
        progressGrp.orientation = "column";
        progressGrp.alignChildren = ["fill", "center"];
        progressGrp.spacing = 2;

        var statusText = progressGrp.add("statictext", undefined, "Ready");
        statusText.alignment = ["center", "center"];
        var progressBar = progressGrp.add("progressbar", undefined, 0, 100);
        progressBar.preferredSize.height = 8;

        // -------------------------------------------------------------
        // Interaction Handlers & State Management
        // -------------------------------------------------------------

        var selectedFolderPath = "";

        // Mode switch
        ddlMode.onChange = function() {
            var isAssemble = (ddlMode.selection.index === 0);
            
            // Toggle panels visibility and size constraints to reclaim space
            targetPanel.visible = isAssemble;
            layoutPanel.visible = isAssemble;
            batchPanel.visible = !isAssemble;
            
            if (isAssemble) {
                targetPanel.maximumSize = undefined;
                targetPanel.preferredSize = undefined;
                layoutPanel.maximumSize = undefined;
                layoutPanel.preferredSize = undefined;
                
                batchPanel.maximumSize = [0, 0];
                batchPanel.preferredSize = [0, 0];
            } else {
                targetPanel.maximumSize = [0, 0];
                targetPanel.preferredSize = [0, 0];
                layoutPanel.maximumSize = [0, 0];
                layoutPanel.preferredSize = [0, 0];
                
                batchPanel.maximumSize = undefined;
                batchPanel.preferredSize = undefined;
                
                // Toggle folder select layout constraints
                batchFolderSelectGrp.visible = rdoBatchFolderComps.value;
                if (rdoBatchFolderComps.value) {
                    batchFolderSelectGrp.maximumSize = undefined;
                    batchFolderSelectGrp.preferredSize = undefined;
                } else {
                    batchFolderSelectGrp.maximumSize = [0, 0];
                    batchFolderSelectGrp.preferredSize = [0, 0];
                }
            }
            
            // Toggle sorting controls (only useful for Assemble)
            sortingRow.visible = isAssemble;
            sortingRow.maximumSize = isAssemble ? undefined : [0, 0];
            sortingRow.preferredSize = isAssemble ? undefined : [0, 0];
            
            // Adjust running button text
            btnRun.text = isAssemble ? "Import & Arrange Media" : "Batch Place into Compositions";

            myPanel.layout.layout(true);
            if (myPanel instanceof Window) {
                myPanel.layout.resize();
            }
        };

        // Source mode change
        rdoFolder.onClick = function() {
            btnChooseFolder.enabled = true;
            lblFolderPath.enabled = true;
            chkCreateProjFolder.enabled = true;
        };

        rdoSelection.onClick = function() {
            btnChooseFolder.enabled = false;
            lblFolderPath.enabled = false;
            chkCreateProjFolder.enabled = false;
        };

        btnChooseFolder.onClick = function() {
            var selectedFolder = Folder.selectDialog("Select source folder with media files");
            if (selectedFolder) {
                selectedFolderPath = selectedFolder.fsName;
                lblFolderPath.text = selectedFolder.name;
            }
        };

        // Target mode change (Assemble)
        rdoActiveComp.onClick = function() {
            txtCompName.enabled = false;
            chkMatchFirst.enabled = false;
            txtWidth.enabled = false;
            txtHeight.enabled = false;
            txtFPS.enabled = false;
        };

        rdoNewComp.onClick = function() {
            txtCompName.enabled = true;
            chkMatchFirst.enabled = true;
            txtWidth.enabled = !chkMatchFirst.value;
            txtHeight.enabled = !chkMatchFirst.value;
            txtFPS.enabled = true;
        };

        chkMatchFirst.onClick = function() {
            txtWidth.enabled = !chkMatchFirst.value;
            txtHeight.enabled = !chkMatchFirst.value;
        };

        txtWidth.enabled = !chkMatchFirst.value;
        txtHeight.enabled = !chkMatchFirst.value;

        // Layout mode change (Assemble)
        rdoStack.onClick = function() {
            txtOverlap.enabled = false;
            chkDissolve.enabled = false;
        };

        rdoSequence.onClick = function() {
            txtOverlap.enabled = true;
            chkDissolve.enabled = true;
        };

        // Target selections (Batch Place)
        var currentProjectFolders = [];

        function refreshProjectFoldersDropdown() {
            ddlTargetFolder.removeAll();
            currentProjectFolders = getProjectFolders();
            if (currentProjectFolders.length === 0) {
                ddlTargetFolder.add("item", "-- No Folders in Project Panel --");
                ddlTargetFolder.selection = 0;
            } else {
                for (var i = 0; i < currentProjectFolders.length; i++) {
                    ddlTargetFolder.add("item", currentProjectFolders[i].name);
                }
                var selectIdx = 0;
                for (var j = 0; j < currentProjectFolders.length; j++) {
                    if (currentProjectFolders[j].name.toLowerCase().indexOf("horizontal media") !== -1) {
                        selectIdx = j;
                        break;
                    }
                }
                ddlTargetFolder.selection = selectIdx;
            }
        }

        rdoBatchSelComps.onClick = function() {
            batchFolderSelectGrp.visible = false;
            batchFolderSelectGrp.maximumSize = [0, 0];
            batchFolderSelectGrp.preferredSize = [0, 0];
            myPanel.layout.layout(true);
            if (myPanel instanceof Window) {
                myPanel.layout.resize();
            }
        };

        rdoBatchFolderComps.onClick = function() {
            batchFolderSelectGrp.visible = true;
            batchFolderSelectGrp.maximumSize = undefined;
            batchFolderSelectGrp.preferredSize = undefined;
            myPanel.layout.layout(true);
            if (myPanel instanceof Window) {
                myPanel.layout.resize();
            }
        };

        btnRefreshFolders.onClick = function() {
            refreshProjectFoldersDropdown();
        };

        refreshProjectFoldersDropdown();

        // Run Triggered
        btnRun.onClick = function() {
            var scaleOptions = ["none", "fit", "fill", "stretch"];
            var selectedScale = scaleOptions[ddlScale.selection.index];

            var isAssembleMode = (ddlMode.selection.index === 0);

            btnRun.enabled = false;

            try {

                if (isAssembleMode) {
                    var sortOptions = ["none", "asc", "desc"];
                    var selectedSort = sortOptions[ddlSort.selection.index];

                    var assembleSettings = {
                        sourceMode: rdoFolder.value ? "folder" : "selection",
                        folderPath: selectedFolderPath,
                        createProjectFolder: chkCreateProjFolder.value,
                        targetMode: rdoNewComp.value ? "new" : "active",
                        compName: txtCompName.text,
                        matchFirstItem: chkMatchFirst.value,
                        compWidth: parseInt(txtWidth.text, 10) || 1920,
                        compHeight: parseInt(txtHeight.text, 10) || 1080,
                        compFPS: parseFloat(txtFPS.text) || 30.0,
                        stillDuration: parseFloat(txtStillDur.text) || 5.0,
                        layoutMode: rdoSequence.value ? "sequence" : "stack",
                        overlap: parseFloat(txtOverlap.text) || 0.0,
                        addDissolve: chkDissolve.value,
                        scaleMode: selectedScale,
                        sortMode: selectedSort
                    };

                    runAssembleWorkflow(assembleSettings, {
                        progressBar: progressBar,
                        statusText: statusText
                    });

                } else {
                    // Batch Place Workflow
                    var selectedFolderIdx = ddlTargetFolder.selection ? ddlTargetFolder.selection.index : -1;
                    var chosenFolderItem = null;
                    if (selectedFolderIdx !== -1 && currentProjectFolders[selectedFolderIdx]) {
                        chosenFolderItem = currentProjectFolders[selectedFolderIdx].item;
                    }

                    var batchSettings = {
                        sourceMode: rdoFolder.value ? "folder" : "selection",
                        folderPath: selectedFolderPath,
                        createProjectFolder: chkCreateProjFolder.value,
                        
                        batchTargetMode: rdoBatchSelComps.value ? "selection" : "folder",
                        batchTargetFolderItem: chosenFolderItem,
                        batchMatchMode: ["sort", "name", "shuffle"][ddlMatch.selection.index] || "sort",
                        batchClearLayers: chkClearLayers.value,
                        batchSyncDuration: chkSyncDuration.value,
                        batchLoopMedia: chkLoopMedia.value,
                        batchRandomOffset: chkRandomOffset.value,
                        batchStackPosition: (ddlPosition.selection.index === 0) ? "top" : "bottom",
                        stillDuration: parseFloat(txtBatchStillDur.text) || 5.0,
                        scaleMode: selectedScale
                    };

                    runBatchPlaceWorkflow(batchSettings, {
                        progressBar: progressBar,
                        statusText: statusText
                    });
                }
            } catch (err) {
                alert("An error occurred during execution:\n" + err.toString());
                statusText.text = "Error occurred.";
                progressBar.value = 0;
            } finally {
                btnRun.enabled = true;
            }
        };

        // Trigger initial mode state selection and layout calculation
        ddlMode.selection = 0;
        myPanel.layout.layout(true);
        return myPanel;
    }

    // Launch UI
    var myScriptPal = buildUI(thisObj);
    if (myScriptPal instanceof Window) {
        myScriptPal.center();
        myScriptPal.show();
    }
})(this);
