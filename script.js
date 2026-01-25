/* exported gapiLoaded */
/* exported gisLoaded */
/* exported handleAuthClick */
/* exported handleSignoutClick */

// TODO(developer): Set to client ID and API key from the Developer Console
// only classroom
const CLIENT_ID = '700908545505-6p39r6fvlj9l2mgs92f2q0s4rq9ubtv7.apps.googleusercontent.com';
const API_KEY = 'AIzaSyA7mTKuemz9MEZ5NChYKMjf4FnnrzimgYA';
// 2 with drive
// const CLIENT_ID = '229885589899-19danounelet921mre73jpbhv3hn05tj.apps.googleusercontent.com';
// const API_KEY = 'AIzaSyAd8vDtDSSdEN5-2NjutBvdsDkHa-SZntI';

// Discovery doc URL for APIs used by the quickstart
//const DISCOVERY_DOCS = [
//    'https://classroom.googleapis.com/$discovery/rest',
//    'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'
//];
//const DISCOVERY_DOCS = ['https://classroom.googleapis.com/$discovery/rest']
const DISCOVERY_DOCS = [
    'https://classroom.googleapis.com/$discovery/rest',
    'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'
];

// Authorization scopes required by the API; multiple scopes can be
// included, separated by spaces.
// const SCOPES = 'https://www.googleapis.com/auth/classroom.courses.readonly https://www.googleapis.com/auth/classroom.courseworkmaterials https://www.googleapis.com/auth/classroom.topics https://www.googleapis.com/auth/drive.file';
const SCOPES = 'https://www.googleapis.com/auth/classroom.courses.readonly https://www.googleapis.com/auth/classroom.courseworkmaterials https://www.googleapis.com/auth/classroom.topics https://www.googleapis.com/auth/drive';

let tokenClient;
let gapiInited = false;
let gisInited = false;

document.getElementById('authorize_button').style.visibility = 'hidden';
document.getElementById('signout_button').style.visibility = 'hidden';

/**
 * Callback after api.js is loaded.
 */
function gapiLoaded() {
    gapi.load('client', initializeGapiClient);
}

/**
 * Callback after the API client is loaded. Loads the
 * discovery doc to initialize the API.
 */
async function initializeGapiClient() {
    await gapi.client.init({
        apiKey: API_KEY,
        discoveryDocs: DISCOVERY_DOCS,
    });
    gapiInited = true; 
    maybeEnableButtons();
}

/**
 * Callback after Google Identity Services are loaded.
 */
function gisLoaded() {
    tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: '', // defined later
    });
    gisInited = true;
    maybeEnableButtons();
}

/**
 * Enables user interaction after all libraries are loaded.
 */
function maybeEnableButtons() {
    if (gapiInited && gisInited) {
        document.getElementById('authorize_button').style.visibility = 'visible';
    }
}

/**
 *  Sign in the user upon button click.
 */
function handleAuthClick() {
    tokenClient.callback = async (resp) => {
        if (resp.error !== undefined) {
            throw (resp);
        }
        document.getElementById('signout_button').style.visibility = 'visible';
        document.getElementById('authorize_button').innerText = 'Refresh';

        // this should be asynchronous, but it looks like gapi completes requests one by one
        let srcPromise = courseLists["src-course-container"].load();
        console.log("load src-courses done");
        let dstPromise = courseLists["dst-course-container"].load();
        console.log("load dst-courses done");
        await srcPromise;
        console.log("await promise src-courses done")
        courseLists["src-course-container"].show();
        await dstPromise;
        console.log("await promise dst-courses done")
        courseLists["dst-course-container"].show();
    };

    if (gapi.client.getToken() === null) {
        // Prompt the user to select a Google Account and ask for consent to share their data
        // when establishing a new session.
        tokenClient.requestAccessToken({ prompt: 'consent' });
    } else {
        // Skip display of account chooser and consent dialog for an existing session.
        tokenClient.requestAccessToken({ prompt: '' });
    }
}

/**
 *  Sign out the user upon button click.
 */
function handleSignoutClick() {
    const token = gapi.client.getToken();
    if (token !== null) {
        google.accounts.oauth2.revoke(token.access_token);
        gapi.client.setToken('');
        document.getElementById('content').innerText = '';
        document.getElementById('authorize_button').innerText = 'Authorize';
        document.getElementById('signout_button').style.visibility = 'hidden';
    }
}

/**
 * Handles for user interaction
 */

async function handleSelectCourse(selectObject, container) {
    let courseId = selectObject.value;
    console.log(`user selected courseId ${courseId}`);
    //console.log(selectObject);

    // update course link
    let courseContainer = selectObject.closest('.course-list').closest('div[id$="-course-container"]');
    let courseLink = courseContainer.querySelector('.course-link');
    if (courseLink) {
        if (courseId && courseId !== 'kies') {
            // Convert numeric courseId to base64url format (as used by Google Classroom)
            let base64Id = btoa(courseId).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
            courseLink.href = `https://classroom.google.com/w/${base64Id}/t/all`;
            courseLink.style.display = 'inline';
        } else {
            courseLink.href = 'https://classroom.google.com/';
            courseLink.style.display = 'none';
        }
    }

    await materialLists[container].load(courseId);
    materialLists[container].show();
}

async function handleCheckTopic(selectObject) {
    // check/uncheck all materials in topic
    let topicItem = selectObject.closest('.topic-item');
    let topicId = topicItem.querySelector('.topic-id').textContent;
    let topicChecked = false;
    if (topicItem.querySelector('.topic-input:checked')) { topicChecked = true };

    materialLists["src-material-container"].selectAllInTopic(topicId, topicChecked);

    // adjust DOM of srcMaterials
    materialLists["src-material-container"].show();
}

async function handleCheckMaterial(selectObject) {
    // check/uncheck material
    let materialItem = selectObject.closest('.material-item');
    let materialId = materialItem.querySelector('.material-id').textContent;
    let materialChecked = false;
    if (materialItem.querySelector('.material-input:checked')) { materialChecked = true };

    // update source material and dom
    materialLists["src-material-container"].select(materialId, materialChecked);
    materialLists["src-material-container"].show();
}

async function handleCopyClick(srcContainer, dstContainer) {
    console.log("start copying");
    await materialLists[srcContainer].copySelection(materialLists[dstContainer].courseId);
    console.log("start reloading dstContainer");
    await materialLists[dstContainer].load(materialLists[dstContainer].courseId);
    console.log("start showing dstContainer");
    materialLists[dstContainer].show();
}

/**
 *  Classes definitions
 */

const COURSES_PAGE_SIZE = 1000; // maximum number of courses
const TOPICS_PAGE_SIZE = 100; // maximum number of topics per course
const MATERIALS_PAGE_SIZE = 1000; // maximum number of materials per course

// natural, case-insensitive comparator with numeric awareness
// this functions is used for sorting
function naturalCompare(left, right) {
    const tokenize = (value) => (value || '').toLowerCase().match(/\d+|\D+/g) || [];
    const tokensA = tokenize(left);
    const tokensB = tokenize(right);
    const length = Math.max(tokensA.length, tokensB.length);

    for (let i = 0; i < length; i++) {
        const partA = tokensA[i];
        const partB = tokensB[i];

        if (partA === undefined) return -1;
        if (partB === undefined) return 1;

        const numA = partA.match(/^\d+$/) ? parseInt(partA, 10) : null;
        const numB = partB.match(/^\d+$/) ? parseInt(partB, 10) : null;

        if (numA !== null && numB !== null) {
            if (numA < numB) return -1;
            if (numA > numB) return 1;
        } else if (numA !== null) {
            return -1;
        } else if (numB !== null) {
            return 1;
        } else {
            if (partA < partB) return -1;
            if (partA > partB) return 1;
        }
    }
    return 0;
}


class CourseList {
    constructor(selector) {
        this.selector = selector; // css selector for html container that contains course-list
        this.courses = [];
    }
    // method to load materials in course
    async load() {
        // retrieve courses from gapi
        let promise;
        try {
            promise = gapi.client.classroom.courses.list({
                pageSize: COURSES_PAGE_SIZE,
            });
        } catch (error) {
            console.log(error.message);
            return;
        }
        let response = await promise;

        // store retreived courses in memory
        try {
            this.courses = response.result.courses.filter(course => course.courseState === "ACTIVE");
        } catch (error) {
            console.log(error.message);
            console.log(this.courses);
            return;
        }

        // sort courses by name (descending)
        // when commented, the same order as in google classroom is used
        // this.courses.sort((a, b) => naturalCompare(b.name, a.name));

        return this.courses;
    }
    show() {
        let courseListElement = document.querySelector(`${this.selector} .course-list`)

        // remove old items from DOM
        let courseItems = courseListElement.querySelectorAll('.course-item');
        for (let courseItem of courseItems) {
            courseItem.remove();
        }

        // add new items to DOM
        let template = courseListElement.querySelector('.course-item-template');

        let clone = template.content.cloneNode(true);
        clone.querySelector("option").value = `kies`;
        clone.querySelector(".course-id").textContent = `classroom-id`;
        clone.querySelector(".course-name").textContent = `Kies je classroom`;
        courseListElement.appendChild(clone);

        for (let course of this.courses) {
            clone = template.content.cloneNode(true);
            clone.querySelector("option").value = `${course.id}`;
            clone.querySelector(".course-id").textContent = `${course.id}`;
            clone.querySelector(".course-name").textContent = `${course.name}`;
            courseListElement.appendChild(clone);
        }
    }
}

class MaterialList {
    constructor(selector) {
        this.selector = selector; // css selector
        this.materials = [];
        this.courseId = undefined;
    }

    async load(courseId) {
        this.courseId = courseId;
        // retrieve materiallist from gapi
        let materialPromise;
        try {
            materialPromise = gapi.client.classroom.courses.courseWorkMaterials.list({
                courseId: `${courseId}`,
                courseWorkMaterialStates: ["DRAFT", "PUBLISHED"],
                pageSize: MATERIALS_PAGE_SIZE,
            });
        } catch (error) {
            console.log(error.message);
            return;
        }

        // retrieve topics from gapi
        let topicPromise;
        try {
            topicPromise = gapi.client.classroom.courses.topics.list({
                courseId: `${courseId}`,
                pageSize: TOPICS_PAGE_SIZE,
            });
        } catch (error) {
            console.log(error.message);
            return;
        }

        // wait until data is retrieved
        let materialResponse = await materialPromise;
        let topicResponse = await topicPromise;

        // copy retrieved materials to class
        try {
            this.materials = materialResponse.result.courseWorkMaterial
            console.log(this.materials);
        } catch (error) {
            console.log(error.message);
            console.log(materialResponse);
            return;
        }

        // copy retrieved topics to temp variable
        let topics = undefined;
        try {
            topics = topicResponse.result.topic
        } catch (error) {
            console.log(error.message);
            console.log(topicResponse);
            return;
        }

        // add corresponding topic to each material
        if (topics ? topics.length > 0 : false) {
            if (this.materials ? this.materials.length > 0 : false) {
                for (let [index, material] of this.materials.entries()) {
                    this.materials[index] = Object.assign({},
                        topics.find(topic => topic.topicId === material.topicId),
                        material);
                }
            }
        }

        // add topics that have no materials as empty materials with topic
        if (topics ? topics.length > 0 : false) {
            for (let topic of topics) {
                if (this.materials) {
                    if (!this.materials.find(material => material.topicId === topic.topicId)) {
                        this.materials.push(topic);
                    }
                }
            }
        }

        // sort materials by topic name, then material title (ascending)
        // sorting is case insensitive and natural (i.e., "topic 2" comes before "Topic 10")
        // the google classroom api does not guarantee any specific order
        this.materials.sort((a, b) => {
            const topicA = (a.name || '');
            const topicB = (b.name || '');
            const topicCompare = naturalCompare(topicA, topicB);
            if (topicCompare !== 0) return topicCompare;

            const titleA = (a.title || '');
            const titleB = (b.title || '');
            const materialCompare = naturalCompare(titleA, titleB);
            if (materialCompare !== 0) return materialCompare;
            return 0;
        });

        return this.materials;
    }

    async copySelection(dstCourseId) {

        // log element in DOM
        let logElement = document.querySelector(`#logcontent`)
        let logContainer = document.querySelector(`#logcontainer`)
        const appendLog = (message) => {
            logElement.textContent += message;
            logContainer.scrollTop = logContainer.scrollHeight - logContainer.clientHeight;
        };
        logElement.textContent =`Start copying!\n`;
        appendLog('');

        // Load destination topics
        let dstTopicsResponse = await gapi.client.classroom.courses.topics.list({
            courseId: dstCourseId,
            pageSize: TOPICS_PAGE_SIZE,
        });
        let dstTopics = dstTopicsResponse.result.topic || [];

        // Get selected materials from source
        let selectedMaterials = this.selected();
        if (!selectedMaterials || selectedMaterials.length === 0) return;

        // Determine unique selected topics from selected materials
        let selectedTopics = [];
        for (let material of selectedMaterials) {
            if (material.name && !selectedTopics.some(topic => topic.name === material.name)) {
                selectedTopics.push({
                    name: material.name,
                    topicId: material.topicId
                });
            }
        }

        // Copy topics to destination if they do not exist yet (by name)
        let topicNameToIdMap = {};
        for (let topic of selectedTopics.slice().reverse()) { // slice makes a copy of the array, reverse to keep original order afte copying]
            let existingDstTopic = dstTopics.find(dstTopic => dstTopic.name === topic.name);
            if (existingDstTopic) {
                appendLog(`No need to copy topic "${topic.name}", topic already exists in destination, using existing topic.\n`);
                topicNameToIdMap[topic.name] = existingDstTopic.topicId;
            } else {
                try {
                    let topicCreateResponse = await gapi.client.classroom.courses.topics.create({
                        courseId: dstCourseId,
                        resource: { name: topic.name }
                    });
                    topicNameToIdMap[topic.name] = topicCreateResponse.result.topicId;
                    appendLog(`Copied topic "${topic.name}" to destination.\n`);
                } catch (error) {
                    appendLog(`Could not copy topic "${topic.name}" to destination: ${error.message}\n`);
                }
            }
        }

        // Find or create "Classroom" folder in Drive
        let classroomFolderId = await findOrCreateFolder('Classroom', null);
        // Find or create folder for this destination classroom
        let dstCourse = courseLists["dst-course-container"].courses.find(c => c.id === dstCourseId);
        let dstCourseName = dstCourse ? dstCourse.name : `Classroom ${dstCourseId}`;
        let dstClassroomFolderId = await findOrCreateFolder(dstCourseName, classroomFolderId);

        // Extract class name from dstCourseName (between first and second '|')
        let className = "copy";
        if (dstCourseName) {
            let parts = dstCourseName.split('|');
            if (parts.length > 2) {
                className = parts[1].trim();
            }
        }

        // Copy each selected material to destination, making new copies of all attachments
        for (let srcMaterial of selectedMaterials.slice().reverse()) { // slice makes a copy of the array, reverse to keep original order afte copying]
            let newMaterials = [];
            if (srcMaterial.materials && Array.isArray(srcMaterial.materials)) {
                for (const mat of srcMaterial.materials) {
                    if (mat.driveFile && mat.driveFile.driveFile) {
                        let fileId = mat.driveFile.driveFile.id;
                        let srcfilename = mat.driveFile.driveFile.title ? mat.driveFile.driveFile.title : "Unnamed";
                        // splits naam in basis + extensie
                        let dotIndex = srcfilename.lastIndexOf(".");
                        let basename = dotIndex > -1 ? srcfilename.substring(0, dotIndex) : srcfilename;
                        let extension = dotIndex > -1 ? srcfilename.substring(dotIndex) : "";
                        // voeg className vóór de extensie toe
                        let dstfilename = `${basename} (${className})${extension}`;

                        try {
                            let fileCopyResponse = await gapi.client.drive.files.copy({
                                fileId: fileId,
                                resource: {
                                    name: dstfilename,
                                    parents: [dstClassroomFolderId]
                                }
                            });
                            newMaterials.push({
                                driveFile: {
                                    driveFile: {
                                        id: fileCopyResponse.result.id,
                                        title: fileCopyResponse.result.name
                                    }
                                }
                            });
                            appendLog(`  Copied file ${srcfilename} to ${dstfilename}\n`);
                        } catch (error) {
                            appendLog(`  Could not copy file ${srcfilename} to ${dstfilename}\n`);
                        }
                    } else {
                        newMaterials.push(mat);
                    }
                }
            }

            // Prepare material object for creation
            let newMaterial = {
                title: srcMaterial.title,
                description: srcMaterial.description,
                topicId: topicNameToIdMap[srcMaterial.name] || undefined,
                materials: newMaterials,
                state: "DRAFT" // 'DRAFT' for concept or 'PUBLISHED' for posted
            };
            try {
                await gapi.client.classroom.courses.courseWorkMaterials.create({
                    courseId: dstCourseId,
                    resource: newMaterial
                });
                appendLog(`Copied material "${srcMaterial.title}" to destination.\n`);
            } catch (error) {
                appendLog(`Could not copy material "${srcMaterial.title}" to destination: ${error.message}\n`);
            }
        }
        appendLog(`Finished copying!\n`);
    }
    show() {
        console.log("show()");
        //console.log(this.materials);

        // store scroll position
        let scrollY = window.scrollY; 
        let scrollX = window.scrollX; 

        // find topcilist element in DOM
        let topicListElement = document.querySelector(`${this.selector} .topic-list`)

        // remove old topics and materials from DOM
        //console.log(topicListElement);
        let topicItems = topicListElement.querySelectorAll('.topic-item');
        for (let topicItem of topicItems) {
            topicItem.remove();
        }

        // create list of unique topics from all materials
        let uniqueTopics = [];
        //console.log(`this.materials:\n${this.materials}`)
        if (this.materials ? this.materials.length > 0 : false) {
            for (let material of this.materials) {
                if (!uniqueTopics.some(topic => topic.topicId === material.topicId)) {
                    uniqueTopics.push(material)
                }
            }
        }

        // add new topics to dom
        let templateTopicItem = topicListElement.querySelector('.topic-item-template');
        for (let topic of uniqueTopics) {
            // clone topic
            let cloneTopicItem = templateTopicItem.content.cloneNode(true);
            cloneTopicItem.querySelector(".topic-id").textContent = `${topic.topicId}`;
            cloneTopicItem.querySelector(".topic-name").textContent = `${topic.name}`;
            if (cloneTopicItem.querySelector(".topic-input")) {
                // set check of topic according to underlying materials
                let cloneTopicInput = cloneTopicItem.querySelector(".topic-input")
                let materialCounted = this.materials.filter(material => material.topicId === topic.topicId).length;
                let materialsChecked = this.materials.filter(material => material.topicId === topic.topicId && material.checked === true).length;
                if (materialsChecked > 0) {
                    cloneTopicInput.checked = true;
                } else {
                    cloneTopicInput.checked = false;
                }
                if (materialsChecked > 0 && materialsChecked < materialCounted) {
                    cloneTopicInput.indeterminate = true;
                } else {
                    cloneTopicInput.indeterminate = false;
                }
            }
            // add materials to cloned topic
            let materialListElement = cloneTopicItem.querySelector('.material-list');
            let templateMaterialItem = materialListElement.querySelector('.material-item-template');
            for (let material of this.materials.filter(material => material.topicId === topic.topicId)) {
                let cloneMaterialItem = templateMaterialItem.content.cloneNode(true);
                cloneMaterialItem.querySelector(".material-id").textContent = `${material.id}`;
                cloneMaterialItem.querySelector(".material-name").textContent = `${material.title}`;
                cloneMaterialItem.querySelector(".material-name").classList.add(material.status);
                if (material.state === "DRAFT") {
                    cloneMaterialItem.querySelector(".material-name").classList.add("draft");
                }
                if (cloneMaterialItem.querySelector(".material-input")) {
                    cloneMaterialItem.querySelector(".material-input").checked = material.checked;
                }
                materialListElement.appendChild(cloneMaterialItem);
            }
            // add cloned topic to dom
            topicListElement.appendChild(cloneTopicItem);

            // restore scroll position
            window.scrollTo(scrollX, scrollY);
        }
    }
    selectAllInTopic(topicId, checked) {
        for (let material of this.materials) {
            if (material.topicId === topicId) {
                material.checked = checked;
            }
        }
    }
    select(id, checked) {
        for (let material of this.materials) {
            if (material.id === id) {
                material.checked = checked;
            }
        }
    }
    selected() {
        console.log("selected")
        //console.log(this.materials ? this.materials.filter(material => material.checked === true) : "this.materials undefined")
        return this.materials ? this.materials.filter(material => material.checked === true) : undefined;
    }
}

// Helper function to find or create a folder by name and parent
async function findOrCreateFolder(folderName, parentId) {
    // Search for folder
    let query = `mimeType='application/vnd.google-apps.folder' and name='${folderName}' and trashed=false`;
    if (parentId) {
        query += ` and '${parentId}' in parents`;
    }
    let response = await gapi.client.drive.files.list({
        q: query,
        fields: 'files(id, name)',
        spaces: 'drive'
    });
    if (response.result.files && response.result.files.length > 0) {
        return response.result.files[0].id;
    }
    // Create folder if not found
    let folderMetadata = {
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder'
    };
    if (parentId) {
        folderMetadata.parents = [parentId];
    }
    let createResponse = await gapi.client.drive.files.create({
        resource: folderMetadata,
        fields: 'id'
    });
    return createResponse.result.id;
}

/**
 *  Objects of classes (global)
 */

let courseLists = {
    "src-course-container": new CourseList('#src-course-container'),
    "dst-course-container": new CourseList('#dst-course-container')
}

let materialLists = {
    "src-material-container": new MaterialList('#src-material-container'),
    "dst-material-container": new MaterialList('#dst-material-container')
}
