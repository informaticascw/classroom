/* exported gapiLoaded */
/* exported gisLoaded */
/* exported handleAuthClick */
/* exported handleSignoutClick */

// TODO(developer): Set to client ID and API key from the Developer Console
const CLIENT_ID = '700908545505-6p39r6fvlj9l2mgs92f2q0s4rq9ubtv7.apps.googleusercontent.com';
const API_KEY = 'AIzaSyA7mTKuemz9MEZ5NChYKMjf4FnnrzimgYA';

// Discovery doc URL for APIs used by the quickstart
const DISCOVERY_DOC = 'https://classroom.googleapis.com/$discovery/rest';

// Authorization scopes required by the API; multiple scopes can be
// included, separated by spaces.
const SCOPES = 'https://www.googleapis.com/auth/classroom.courses.readonly https://www.googleapis.com/auth/classroom.courseworkmaterials.readonly https://www.googleapis.com/auth/classroom.topics.readonly';

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
        discoveryDocs: [DISCOVERY_DOC],
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

        let promise1 = courseLists["src-course-container"].load();
        let promise2 = courseLists["dst-course-container"].load();
        console.log("await promise1 src-courses")
        await promise1;
        console.log("await promise2 dst-courses")
        await promise2;
        console.log("awaits promise 1 and 2 done")
        //await Promise.all([promise1, promise2])
        courseLists["src-course-container"].show();
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
 *  Classes definitions
 */

class CourseList {
    constructor(selector) {
        this.selector = selector; // css selector for html container that contains course-list
        this.courses = [];
    }
    // method to load materials in course
    async load() {
        // retrieve courses from gapi
        //let response;
        let promise;
        try {
            promise = gapi.client.classroom.courses.list({
                pageSize: 10,
            });
        } catch (error) {
            console.log(error.message);
            return;
        }
        let response = await promise; // await reponse will make response undefined
        try {
            this.courses = response.result.courses;
        } catch (error) {
            console.log(error.message);
            console.log(this.courses);
            return;
        }
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

// Inheritance example
class MaterialList {
    constructor(selector) {
        this.selector = selector; // css selector
        this.materials = [];
    }
    // method to load materials in course
    async load(courseId) {
        // retrieve materiallist from gapi
        let materialPromise;
        try {
            materialPromise = gapi.client.classroom.courses.courseWorkMaterials.list({
                courseId: `${courseId}`,
                pageSize: 50,
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
                pageSize: 10,
            });
        } catch (error) {
            console.log(error.message);
            return;
        }

        // wait untill data is retreived
        let materialResponse = await materialPromise;
        let topicResponse = await topicPromise;

        // copy retreived materials to class
        try {
            this.materials = materialResponse.result.courseWorkMaterial
        } catch (error) {
            console.log(error.message);
            console.log(materialResponse);
            return;
        }

        // copy retreived topics to temp variable
        let topics;
        try {
            topics = topicResponse.result.topic
        } catch (error) {
            console.log(error.message);
            console.log(topicResponse);
            return;
        }

        // add corresponding topic to each material
        if (this.materials.length > 0) {
            for (let [index, material] of this.materials.entries()) {
                this.materials[index] = Object.assign({},
                    topics.find(topic => topic.topicId === material.topicId),
                    material);
            }
        }

        return this.materials;
    }
    show() {
        console.log("show()");
        console.log(this.materials);

        let topicListElement = document.querySelector(`${this.selector} .topic-list`)

        // remove old topics and materials from DOM
        console.log(topicListElement);
        let topicItems = topicListElement.querySelectorAll('.topic-item');
        for (let topicItem of topicItems) {
            topicItem.remove();
        }

        // create list of unique topics from all materials
        let uniqueTopics = [];
        for (let material of this.materials) {
            if (!uniqueTopics.some(topic => topic.topicId === material.topicId)) {
                uniqueTopics.push(material)
            }
        }

        // add new topics to dom
        let templateTopicItem = topicListElement.querySelector('.topic-item-template');
        for (let topic of uniqueTopics) {
            // clone topic
            let cloneTopicItem = templateTopicItem.content.cloneNode(true);
            cloneTopicItem.querySelector(".topic-id").textContent = `${topic.topicId}`;
            cloneTopicItem.querySelector(".topic-name").textContent = `${topic.name}`;
            console.log(topicListElement)
            // add materials to cloned topic
            let materialListElement = cloneTopicItem.querySelector('.material-list');
            let templateMaterialItem = materialListElement.querySelector('.material-item-template');
            for (let material of this.materials.filter(material => material.topicId === topic.topicId)) {
                let cloneMaterialItem = templateMaterialItem.content.cloneNode(true);
                cloneMaterialItem.querySelector(".material-id").textContent = `${material.id}`;
                cloneMaterialItem.querySelector(".material-name").textContent = `${material.title}`;
                cloneMaterialItem.querySelector(".material-name").classList.add(material.status);
                console.log("clone");
                console.log(cloneMaterialItem);
                materialListElement.appendChild(cloneMaterialItem);
            }
            // add cloned topic to dom
            topicListElement.appendChild(cloneTopicItem);
        }
    }
    select(id, checked) {
        for (let material of this.materials) {
            if (material.id === id) {
                material.checked = checked;
                console.log("checked");
                console.log(material);
            }
        }
    }
    selected() {
        console.log("selected")
        console.log(this.materials.filter(material => material.checked === true))
        return this.materials.filter(material => material.checked === true)
    }
    add(srcMaterials) {
        // remove materials with status "added" 
        this.materials = this.materials.filter(material => material.status !== "add");
        // remove status "update"
        for (let material of this.materials) {
            if (material.status === "update") {
                delete (material.status);
            }
        }

        // add materials and assign status "update"
        for (let srcMaterial of srcMaterials) {
            if (this.materials.find(dstMaterial => dstMaterial.title === srcMaterial.title)) {
                // TODO: doesn't work if same material name is in multiple topics
                this.materials.find(dstMaterial => dstMaterial.title === srcMaterial.title).status = "update";
            } else {
                srcMaterial.status = "add";
                this.materials.push(srcMaterial);
            }
        }
    }
}

/*
class SrcMaterialList extends MaterialList {
    constructor(selector) {
        // super keyword for calling the above 
        // class constructor
        super(selector);
        for (let material of this.materials) {
            material.assign({ checkbox: false })
        }
    }
    select(materialIds) {

    }

}
*/

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


/**
 * Handles for user interaction: selection of source classroom
 */

async function handleSelectCourse(selectObject, container) {
    let courseId = selectObject.value;
    console.log(`user selected courseId ${courseId}`);
    console.log(selectObject);

    await materialLists[container].load(courseId);
    materialLists[container].show();
}

async function handleCheckTopic(selectObject) {
    // adjust checkboxes in DOM
    let materialList = selectObject.closest('.topic-item');
    let materialInputs = materialList.querySelectorAll('.material-input');
    for (let materialInput of materialInputs) {
        materialInput.checked = selectObject.checked
    }

    // update checkboxes in object materialLists["src-material-container"]
    let topicList = selectObject.closest('.topic-list');
    let materialItems = topicList.querySelectorAll('.material-item');
    for (let materialItem of materialItems) {
        let checked = materialItem.querySelector('.material-input').checked;
        let id = materialItem.querySelector('.material-id').textContent;
        materialLists["src-material-container"].select(id, checked);
    }

    materialLists["dst-material-container"].add(materialLists["src-material-container"].selected());
    materialLists["dst-material-container"].show();
}

// TODO: rewrite this function more simple, maybe move dom-stuff to class
async function handleCheckMaterial(selectObject) {
    let materialItem = selectObject.closest('.material-item');
    let materialId = materialItem.querySelector('.material-id').textContent;
    let materialChecked = false;
    if (materialItem.querySelector('.material-input:checked')) { materialChecked = true };

    let topicItem = selectObject.closest('.topic-item');
    let topicInput = topicItem.querySelector('.topic-input');
    let materialInputs = topicItem.querySelectorAll('.material-input');
    let materialCounted = materialInputs.length
    let materialChecks = topicItem.querySelectorAll('.material-input:checked');
    let materialsChecked = materialChecks.length

    if (materialsChecked > 0) {
        topicInput.checked = true;
    } else {
        topicInput.checked = false;
    }
    if (materialsChecked > 0 && materialsChecked < materialCounted) {
        topicInput.indeterminate = true;
    } else {
        topicInput.indeterminate = false;
    }

    // update source data 
    console.log(materialId);
    materialLists["src-material-container"].select(materialId, materialChecked);
    // TODO: add update source dom

    // update destination data and dom
    console.log("selected materials")
    console.log(materialLists["src-material-container"].selected())
    materialLists["dst-material-container"].add(materialLists["src-material-container"].selected());
    materialLists["dst-material-container"].show();
}



/* add checked materials and topics from source to destination 
   respect already present items
   prevent double entries (based on title, not id)
   mark added items with class
   */
/*
function mergeMaterials() {
    console.log("Merging src into dst");
    let dstTopicList = document.querySelector('#dst-material-container .topic-list');
    // merge topics
    let srcTopicItems = document.querySelectorAll('#src-material-container .topic-item');
    let dstTopicItems = document.querySelectorAll('#dst-material-container .topic-item');
    console.log(srcTopicItems);
    console.log(dstTopicItems);

    for (let srcTopicItem of srcTopicItems) {
        if (srcTopicItem.querySelector('input:checked') !== null) { // topic or material inside is checked}
            // check if srcTopicItem is already present in dst
            let srcTopicName = srcTopicItem.querySelector('.topic-name').textContent;
            let srcDstMatch = false;
            console.log(srcTopicItems);
            console.log(dstTopicItems);
            for (let dstTopicItem of dstTopicItems) {
                let dstTopicName = dstTopicItem.querySelector('.topic-name').textContent;
                if (srcTopicName === dstTopicName) {
                    srcDstMatch = true;
                }
            }
            // copy srcItemTopic to dst if not already present
            if (!srcDstMatch) {
                // add new topics to DOM
                console.log("add Topic from src to dst");
                let template = dstTopicList.querySelector('.topic-item-template');
                clone = template.content.cloneNode(true);
                clone.querySelector(".topic-id").textContent = `${srcTopicItem.querySelector(".topic-id").textContent}`;
                clone.querySelector(".topic-name").textContent = `${srcTopicItem.querySelector(".topic-name").textContent}`;
                clone.querySelector(".topic-item").classList.add("add");
                dstTopicList.appendChild(clone);
            }

            // merge checked materials
            // TODO: only add checked materialItems
            let srcMaterialItems = document.querySelectorAll('#src-material-container .material-item');
            let dstTopicItemsNew = document.querySelectorAll('#dst-material-container .topic-item');
            // repeat for each source material
            for (let srcMaterialItem of srcMaterialItems) {
                if (srcMaterialItem.querySelector('input:checked') !== null) { // material is checked}

                    console.log(srcMaterialItem);
                    // find correct dstTopic
                    for (let dstTopicItem of dstTopicItemsNew) {
                        let dstTopicName = dstTopicItem.querySelector('.topic-name').textContent;
                        let srcTopicName = srcMaterialItem.closest('.topic-item').querySelector('.topic-name').textContent;
                        if (srcTopicName === dstTopicName) {
                            // check if material is already in topic
                            let dstMaterialItems = dstTopicItem.querySelectorAll('.material-item');
                            let srcDstMatch = false;
                            for (let dstMaterialItem of dstMaterialItems) {
                                let srcMaterialName = srcMaterialItem.querySelector('.material-name').textContent;
                                let dstMaterialName = dstMaterialItem.querySelector('.material-name').textContent;
                                if (srcMaterialName === dstMaterialName) {
                                    console.log(`${srcMaterialName}-${dstMaterialName}`);
                                    console.log(dstMaterialItem);
                                    if (!dstMaterialItem.classList.contains('add')) {
                                        dstMaterialItem.classList.add('update');
                                        console.log("update");
                                    }
                                    srcDstMatch = true;
                                }
                            }
                            // copy srcItemMaterial to dst if not already present => ERRORS INSIDE
                            if (!srcDstMatch) {
                                // add new topics to DOM
                                let template = dstTopicItem.querySelector('.material-item-template');
                                clone = template.content.cloneNode(true);
                                clone.querySelector(".material-id").textContent = `${srcMaterialItem.querySelector(".material-id").textContent}`;
                                clone.querySelector(".material-name").textContent = `${srcMaterialItem.querySelector(".material-name").textContent}`;
                                clone.querySelector(".material-item").classList.add("add");
                                dstTopicItem.querySelector('.material-list').appendChild(clone);
                            }
                        }
                    }
                }
            }
        }

    }
}
*/