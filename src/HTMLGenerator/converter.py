import time
import os.path
import subprocess
import pathlib
from pathlib import Path
import json

CURRENT_CONFIGURATION_PATH = "currentConfiguration.txt"
NOTIFICATION_PATH = "complete.txt"
LABVIEW_PATH = Path("C:/Program Files/National Instruments/LabVIEW 2017/LabVIEW.exe")

def _get_path_relative_to_username(filename):
    # Return a path that is relative to the ~user
    s = Path("~") 
    filename_path = Path(filename)
    return str(filename_path.relative_to(s.expanduser()))

def write_configuration_file_and_run_converter(json_with_filepaths, path_to_current_working_directory = Path.cwd()):
    current_configuration_absolute_path = Path(path_to_current_working_directory / CURRENT_CONFIGURATION_PATH)
    # Writing the top, preload, input and output path to the currentConfiguration.txt file.
    try:
        with open(current_configuration_absolute_path, 'w') as current_configuration_file:
            if "topPath" in json_with_filepaths:
                topDirectoryPath = json_with_filepaths["topPath"]
            else:
                raise Exception("topPath cannot be null/empty")
            for configuration in json_with_filepaths["configurations"]:
                current_configuration_file.write(
                '/top:' + str(topDirectoryPath) + "\n")
                # TODO: Look at making preloadFiles to an array.
                if "preloadFiles" in configuration:
                    current_configuration_file.write(
                    '/preload:' + str(Path(configuration["preloadFiles"])) + "\n")
                if "inputPath" in configuration:
                    current_configuration_file.write(
                    '/input:' + str(configuration["inputPath"]) + "\n")
                else:
                    raise Exception("inputPath cannot be null/empty")
                if "outputPath" in configuration:    
                    current_configuration_file.write(
                    '/out:' + str(Path(configuration["outputPath"])) + "\n")
                current_configuration_file.flush()
                current_configuration_file.close()
                run_converter()

    except FileNotFoundError as f:
        error_message = str(f.strerror, _get_path_relative_to_username(f.filename))
        return error_message


def run_converter(path_to_current_working_directory = Path.cwd()):    
    converter_path = Path(path_to_current_working_directory / "ConvertFromConfigurationFile.vi")
    current_configuration_absolute_path = Path(path_to_current_working_directory / CURRENT_CONFIGURATION_PATH)
    notification_absolute_path = Path(path_to_current_working_directory / NOTIFICATION_PATH)
    call_converter_command = str(LABVIEW_PATH) + " " + str(converter_path)
    
    try:
        if os.path.isfile(notification_absolute_path):
            os.remove(notification_absolute_path)                
    except:
        pass

    try:
        process = subprocess.Popen(call_converter_command, stdin=subprocess.PIPE)
    except OSError as e:
        error_message = str(e)
        print(error_message , "\n")
        return error_message   

    while(True):
        if(os.path.isfile(notification_absolute_path)): 
            process.stdin.close()
            process.wait()
            break
        else:
            time.sleep(3)
    os.remove(notification_absolute_path)
    os.remove(current_configuration_absolute_path)

    return

def convert_from_JSON(jsonFilePath) :
    with open(jsonFilePath) as jsonFile:
        json_with_filepaths = json.load(jsonFile)
        write_configuration_file_and_run_converter(json_with_filepaths)
