// TODO(developer): Set to client ID and API key from the Developer Console (https://console.cloud.google.com/apis/credentials)
const CLIENT_ID = '700908545505-6p39r6fvlj9l2mgs92f2q0s4rq9ubtv7.apps.googleusercontent.com';
const API_KEY = 'AIzaSyA7mTKuemz9MEZ5NChYKMjf4FnnrzimgYA';

// Discovery doc URL for APIs
const DISCOVERY_DOCS = [
    'https://classroom.googleapis.com/$discovery/rest',
    'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'
];

// Authorization scopes required by the API; 
const REQUIRED_SCOPES = [
  'https://www.googleapis.com/auth/classroom.courses.readonly',
  'https://www.googleapis.com/auth/classroom.courseworkmaterials',
  'https://www.googleapis.com/auth/classroom.coursework.students',
  'https://www.googleapis.com/auth/classroom.topics',
  'https://www.googleapis.com/auth/drive',
];

const SCOPES = REQUIRED_SCOPES.join(' ');

// DOM Selectors
const SELECTORS = {
    AUTHORIZE_BTN: '#authorize_button',
    SIGNOUT_BTN: '#signout_button',
    SRC_COURSE_CONTAINER: '#src-course-container',
    DST_COURSE_CONTAINER: '#dst-course-container',
    SRC_MATERIAL_CONTAINER: '#src-material-container',
    DST_MATERIAL_CONTAINER: '#dst-material-container',
    LOG_CONTENT: '#logcontent',
    LOG_CONTAINER: '#logcontainer',
    TOPIC_LIST: '.topic-list',
    MATERIAL_LIST: '.material-list',
    COURSE_LIST: '.course-list'
};

// Centralized Application State
const AppState = {
    srcCourseList: null,
    dstCourseList: null,
    srcMaterialList: null,
    dstMaterialList: null,
    tokenClient: null,
    isGapiInited: false,
    isGisInited: false
};

document.querySelector(SELECTORS.AUTHORIZE_BTN).style.display = 'none';
document.querySelector(SELECTORS.SIGNOUT_BTN).style.display = 'none';

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
    AppState.isGapiInited = true; 
    maybeEnableButtons();
}

/**
 * Callback after Google Identity Services are loaded.
 */
function gisLoaded() {
    AppState.tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: '', // defined later
    });
    AppState.isGisInited = true;
    maybeEnableButtons();
}

/**
 * Enables user interaction after all libraries are loaded.
 */
function maybeEnableButtons() {
    if (AppState.isGapiInited && AppState.isGisInited) {
        document.querySelector(SELECTORS.AUTHORIZE_BTN).style.display = 'block';
    }
}

// Declare course and material lists - now in AppState

/**
 *  Sign in the user upon button click.
 */
function handleAuthClick() {
    AppState.tokenClient.callback = async (resp) => {
        if (resp.error !== undefined) {
            throw (resp);
        }
        document.querySelector(SELECTORS.AUTHORIZE_BTN).style.display = 'none';
        document.querySelector(SELECTORS.SIGNOUT_BTN).style.display = 'block';

        await Promise.all([
            AppState.srcCourseList.load(),
            AppState.dstCourseList.load()
        ]);
        AppState.srcCourseList.show();
        AppState.dstCourseList.show();
    };

    if (gapi.client.getToken() === null) {
        // Prompt the user to select a Google Account and ask for consent to share their data
        // when establishing a new session.
        AppState.tokenClient.requestAccessToken({ prompt: 'consent' });
    } else {
        // Skip display of account chooser and consent dialog for an existing session.
        AppState.tokenClient.requestAccessToken({ prompt: '' });
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
        location.reload();
    }
}

/**
 * Handles for user interaction
 */

async function handleSelectCourse(selectObject) {
    let courseId = selectObject.value;
    console.log(`user selected courseId ${courseId}`);
    //console.log(selectObject);

    // update course link
    let courseContainer = selectObject.closest(SELECTORS.COURSE_LIST).closest('div[id$="-course-container"]');
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

    // Determine which material list based on container ID
    let containerId = courseContainer.id;
    let materialList = containerId === 'src-course-container' ? AppState.srcMaterialList : AppState.dstMaterialList;
    await materialList.load(courseId);
    materialList.show();
}

async function handleCheckTopic(selectObject) {
    // check/uncheck all materials in topic
    let topicItem = selectObject.closest('.topic-item');
    let topicId = topicItem.querySelector('.topic-id').textContent;
    let topicChecked = false;
    if (topicItem.querySelector('.topic-input:checked')) { topicChecked = true };

    AppState.srcMaterialList.selectAllInTopic(topicId, topicChecked);

    // adjust DOM of srcMaterials
    AppState.srcMaterialList.show();
}

async function handleCheckMaterial(selectObject) {
    // check/uncheck material
    let materialItem = selectObject.closest('.material-item');
    let materialId = materialItem.querySelector('.material-id').textContent;
    let materialChecked = false;
    if (materialItem.querySelector('.material-input:checked')) { materialChecked = true };

    // update source material and dom
    AppState.srcMaterialList.select(materialId, materialChecked);
    AppState.srcMaterialList.show();
}

async function handleCopyClick() {
    console.log("start copying");
    await AppState.srcMaterialList.copySelection(AppState.dstMaterialList.courseId);
    console.log("start reloading dstContainer");
    await AppState.dstMaterialList.load(AppState.dstMaterialList.courseId);
    console.log("start showing dstContainer");
    AppState.dstMaterialList.show();
}

/**
 *  Classes definitions
 */

const COURSES_PAGE_SIZE = 1000; // maximum number of courses per page
const TOPICS_PAGE_SIZE = 1000; // maximum number of topics per course per page
const MATERIALS_PAGE_SIZE = 1000; // maximum number of materials per course per page
const ASSIGNMENTS_PAGE_SIZE = 1000; // maximum number of assignments per course per page

// locale-stable, case-insensitive, numeric-aware comparator
const naturalCompare = new Intl.Collator('nl', { numeric: true, sensitivity: 'base' }).compare;


class CourseList {
    constructor(selector) {
        this.selector = selector; // css selector for html container that contains course-list
        this.courses = [];
    }
    // method to load materials in course
    async load() {
        let allCourses = [];
        let pageToken;
        try {
            do {
                const response = await gapi.client.classroom.courses.list({
                    pageSize: COURSES_PAGE_SIZE,
                    pageToken,
                });
                const page = response.result.courses || [];
                allCourses = allCourses.concat(page);
                pageToken = response.result.nextPageToken;
            } while (pageToken);
        } catch (error) {
            console.log(error.message);
            return;
        }

        this.courses = allCourses.filter(course => course.courseState === "ACTIVE");
        return this.courses;
    }
    show() {
        let courseListElement = document.querySelector(`${this.selector} ${SELECTORS.COURSE_LIST}`)

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
        let allMaterials = [];
        let allAssignments = [];
        let allTopics = [];
        let pageToken;

        // retrieve all material pages from gapi
        try {
            do {
                const response = await gapi.client.classroom.courses.courseWorkMaterials.list({
                    courseId: `${courseId}`,
                    courseWorkMaterialStates: ["DRAFT", "PUBLISHED"],
                    pageSize: MATERIALS_PAGE_SIZE,
                    pageToken,
                });
                const page = response.result.courseWorkMaterial || [];
                allMaterials = allMaterials.concat(page);
                pageToken = response.result.nextPageToken;
            } while (pageToken);
        } catch (error) {
            console.error(`Could not load materials for course ${courseId}:`, error);
        }

        pageToken = undefined;
        // retrieve all assignment pages from gapi
        try {
            do {
                const response = await gapi.client.classroom.courses.courseWork.list({
                    courseId: `${courseId}`,
                    courseWorkStates: ["DRAFT", "PUBLISHED"],
                    pageSize: ASSIGNMENTS_PAGE_SIZE,
                    pageToken,
                });
                const page = response.result.courseWork || [];
                allAssignments = allAssignments.concat(page);
                pageToken = response.result.nextPageToken;
            } while (pageToken);
        } catch (error) {
            console.error(`Could not load assignments for course ${courseId}:`, error);
        }

        pageToken = undefined;
        // retrieve all topic pages from gapi
        try {
            do {
                const response = await gapi.client.classroom.courses.topics.list({
                    courseId: `${courseId}`,
                    pageSize: TOPICS_PAGE_SIZE,
                    pageToken,
                });
                const page = response.result.topic || [];
                allTopics = allTopics.concat(page);
                pageToken = response.result.nextPageToken;
            } while (pageToken);
        } catch (error) {
            console.error(`Could not load topics for course ${courseId}:`, error);
        }

        // Mark assignments with a type property to differentiate them
        for (let assignment of allAssignments) {
            assignment.type = 'assignment';
        }
        // Mark materials with a type property
        for (let material of allMaterials) {
            material.type = 'material';
        }

        // Combine materials and assignments
        this.materials = allMaterials.concat(allAssignments);
        const topics = allTopics;

        // add corresponding topic to each material/assignment
        if (topics?.length > 0 && this.materials?.length > 0) {
            for (let [index, item] of this.materials.entries()) {
                this.materials[index] = Object.assign({},
                    topics.find(topic => topic.topicId === item.topicId),
                    item);
            }
        }

        // add topics that have no materials/assignments as empty materials with topic
        if (topics?.length > 0 && this.materials) {
            for (let topic of topics) {
                if (!this.materials.find(item => item.topicId === topic.topicId)) {
                    this.materials.push(topic);
                }
            }
        }

        // sort materials by topic name, then material title (ascending)
        // sorting is case insensitive and natural (i.e., "topic 2" comes before "Topic 10")
        // the google classroom api does not guarantee any specific order
        this.materials.sort((a, b) => {
            const topicCompare = naturalCompare(a.name || '', b.name || '');
            if (topicCompare !== 0) return topicCompare;
            return naturalCompare(a.title || '', b.title || '');
        });

        return this.materials;
    }

    async copySelection(dstCourseId) {

        // log element in DOM
        let logElement = document.querySelector(SELECTORS.LOG_CONTENT)
        let logContainer = document.querySelector(SELECTORS.LOG_CONTAINER)
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
        let dstCourse = AppState.dstCourseList.courses.find(c => c.id === dstCourseId);
        let dstCourseName = dstCourse ? dstCourse.name : `Classroom ${dstCourseId}`;
        let dstClassroomFolderId = await findOrCreateFolder(dstCourseName, classroomFolderId);

        // Extract class name from dstCourseName (between first and second '|')
        let className = null;
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
                        let dstfilename = srcfilename;
                        if (className || className === "") {
                            // splits naam in basis + extensie
                            let dotIndex = srcfilename.lastIndexOf(".");
                            let basename = dotIndex > -1 ? srcfilename.substring(0, dotIndex) : srcfilename;
                            let extension = dotIndex > -1 ? srcfilename.substring(dotIndex) : "";
                            // voeg className vóór de extensie toe
                            let dstfilename = `${basename} (${className})${extension}`;
                        }
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
                            appendLog(`  Copied file "${srcfilename}" to "${dstfilename}"\n`);
                        } catch (error) {
                            appendLog(`  Could not copy file "${srcfilename}" to "${dstfilename}"\n`);
                        }
                    } else {
                        newMaterials.push(mat);
                    }
                }
            }

            // Prepare material/assignment object for creation based on type
            if (srcMaterial.type === 'assignment') {
                // Prepare assignment object for creation
                let newAssignment = {
                    title: srcMaterial.title,
                    description: srcMaterial.description,
                    topicId: topicNameToIdMap[srcMaterial.name] || undefined,
                    materials: newMaterials,
                    state: "DRAFT", // 'DRAFT' for concept or 'PUBLISHED' for posted
                    maxPoints: srcMaterial.maxPoints || undefined,
                    dueDate: srcMaterial.dueDate || undefined,
                    dueTime: srcMaterial.dueTime || undefined,
                    workType: srcMaterial.workType || "ASSIGNMENT"
                };
                try {
                    await gapi.client.classroom.courses.courseWork.create({
                        courseId: dstCourseId,
                        resource: newAssignment
                    });
                    appendLog(`Copied assignment "${srcMaterial.title}" to destination.\n`);
                } catch (error) {
                    appendLog(`Could not copy assignment "${srcMaterial.title}" to destination: ${error.message}\n`);
                }
            } else {
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
        let topicListElement = document.querySelector(`${this.selector} ${SELECTORS.TOPIC_LIST}`)

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

AppState.srcCourseList = new CourseList(SELECTORS.SRC_COURSE_CONTAINER);
AppState.dstCourseList = new CourseList(SELECTORS.DST_COURSE_CONTAINER);
AppState.srcMaterialList = new MaterialList(SELECTORS.SRC_MATERIAL_CONTAINER);
AppState.dstMaterialList = new MaterialList(SELECTORS.DST_MATERIAL_CONTAINER);
