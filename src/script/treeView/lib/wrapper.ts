import { Main } from "../../main";
import { PathHelper } from "../../pathHelper";
import { TreeHelper } from "./aimaratree";
import { File } from "./file";

export let tree: TreeHelper;
export let rootNode;
export let preDefinedHelp = null;
export let userDefinedHelp = null;
let filteredSubset = null;
let searchStrOldValue = "";
window.onload = () => {
    loadFile();
    window.onmessage = (event) => {
        if (event.data.highlight) {
            toggleSelectedNode(event.data.id);
        } else {
            updateTreeViewAndSearchResults(event.data);
        }
    };
};

function loadFile() {
    const xhr = new XMLHttpRequest();
    xhr.open("GET", PathHelper.getSourcePath("/src/file.json"));
    xhr.send();
    xhr.onreadystatechange = () => {
        if (xhr.readyState === 4) {
            if (xhr.status === 200) {
                File.jsonObj = JSON.parse(xhr.responseText);
                filteredSubset = File.getJSON();
                tree = new TreeHelper("divTree", "white", null, "tree");

                rootNode = tree.directoryTreeView(File.getJSON());

                // Rendering the tree
                tree.drawTree();
                tree.getTreeAndExpandTopLevel("divTree");
                const getParams = window.location.href.split(/=|#/);
                if (getParams.length >= 2) {
                    const fixedStr = decodeURIComponent(getParams[1]);
                    openVI(fixedStr);
                }
            } else {
                alert("No source LabVIEW files found. Please run the converter before launching this tool.");
            }
        }
    };

}

window.onpopstate = () => {
    const currentState = history.state;
    if (currentState) {
        Main.LoadFile(currentState.openedVI);
        // [TODO](Rajneesh): Fix the scroll position.
    }
};

export function filterJson(directoryJson, searchString) {
    let arr = [];
    for (const key in directoryJson) {
        if (typeof (directoryJson[key]) === "object" && directoryJson[key] != null) {
            if (directoryJson.Path === undefined || ((directoryJson.Path.substring(
                directoryJson.Path.lastIndexOf("\\"))).toLowerCase()).indexOf(searchString) <= -1) {
                for (const child of directoryJson.Components) {
                    if (child) {
                        const newArr = filterJson(child, searchString);
                        if (newArr) {
                            arr = arr.concat(newArr);
                        }
                    }
                }
                return arr;
            }
        } else {
            if (((directoryJson.Path.substring(
                directoryJson.Path.lastIndexOf("\\"))).toLowerCase()).indexOf(searchString) > -1) {
                arr = arr.concat(directoryJson);
                return arr;
            }
        }
    }
}

function updateTreeViewAndSearchResults(searchStr: string) {
    if (searchStr.length === 0) {
        document.getElementById("filteredTree").style.display = "none";
        document.getElementById("divTree").style.display = "inline-block";
        filteredSubset = File.getJSON();
    } else {
        let filteredFoldersArr = [];
        if (searchStr.indexOf(searchStrOldValue) > -1) {
            filteredFoldersArr = filterJson(filteredSubset, searchStr.toLowerCase()); // , false);
        } else {
            filteredFoldersArr = filterJson(File.getJSON(), searchStr.toLowerCase()); // , false);
            searchStrOldValue = "";
        }
        if (filteredFoldersArr.length) {
            filteredSubset = {
                Components: filteredFoldersArr,
                ID: "Results",
                Type: "search",
            };
            tree.directoryTreeView(filteredSubset);
        } else {
            document.getElementById("filteredTree").innerHTML = "0 results";
            document.getElementById("filteredTree").style.display = "inline-block";
            document.getElementById("divTree").style.display = "none";
        }
    }
    searchStrOldValue = searchStr;
}
function focusGivenNode(focusNode) {
    if (focusNode.className !== "node_selected") {
        document.getElementsByClassName("node_selected")[0].className = "node";
        focusNode.className = "node_selected";
    }
}
function expandUpwardTree(jsonPath) {
    const jsonPathList = jsonPath.split("/");
    const partialPath = [""];
    for (let i = 1; i < jsonPathList.length - 1; i++) {
        partialPath[partialPath.length] = jsonPathList[i];
        const jsonTreePathString = partialPath.join("/");
        const ulElement = document.getElementById(jsonTreePathString);
        const img = ulElement.firstElementChild;
        const spanElement = img.nextSibling;
        if (img.id !== "toggle_off") {
            const evt = new Event("dblclick");
            spanElement.dispatchEvent(evt);
        }
    }
    const selectNodeParent = document.getElementById(jsonPath);
    const selectedNode = selectNodeParent.getElementsByTagName("span")[0];
    selectedNode.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "start" });
    focusGivenNode(selectedNode);
}

export function toggleSelectedNode(jsonPath) {
    const decodedJsonPath = decodeURIComponent(jsonPath);
    if (decodedJsonPath.split("/").pop() === "control") {
        document.getElementsByClassName("node_selected")[0].className = "node";
    } else {
        const focusNode = document.getElementById(decodedJsonPath);
        let focusNodeTemp = focusNode;
        /* If the tree strcuture for the file that we request is not expanded then,
        we expand it first. Then, we highlight(node_selected) the file in the file-pane.
        Else, we just do the node selection in the file pane for the requested file,
        as the file tree is already open */
        if (focusNodeTemp == null) {
            expandUpwardTree(decodedJsonPath);
        } else if (focusNodeTemp.getElementsByTagName("span")[0].className !== "node_selected") {
            const focusNodeSpan = focusNodeTemp.getElementsByTagName("span")[0];
            while (focusNodeTemp.parentNode.parentNode !== null) {
                const parentSpanElement = focusNodeTemp.parentElement.previousElementSibling;
                const parentImageElement = parentSpanElement.previousElementSibling;
                if (parentImageElement.id !== "toggle_off") {
                    const evt = new Event("dblclick");
                    parentSpanElement.dispatchEvent(evt);
                } else {
                    focusGivenNode(focusNodeSpan);
                    break;
                }
                focusNodeTemp = focusNodeTemp.parentNode.parentElement;
            }
            focusNode.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "start" });
        }
    }
    document.getElementById("filteredTree").style.display = "none";
    document.getElementById("divTree").style.display = "block";
}
export function openVI(viPath) {
    if (viPath) {
        Main.viPath = viPath;
        Main.LoadFile(viPath);
    } else {
        alert("Sub VI Reference not found!");
    }
}
