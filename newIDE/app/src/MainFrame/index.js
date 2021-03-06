import React, { Component } from 'react';
import './MainFrame.css';

import MuiThemeProvider from 'material-ui/styles/MuiThemeProvider';
import IconButton from 'material-ui/IconButton';
import Drawer from 'material-ui/Drawer';
import NavigationClose from 'material-ui/svg-icons/navigation/close';

import Toolbar from './Toolbar';
import StartPage from './StartPage';
import ProjectTitlebar from './ProjectTitlebar';
import ConfirmCloseDialog from './ConfirmCloseDialog';
import EventsSheetContainer from '../EventsSheet/EventsSheetContainer.js';
import SceneEditor from '../SceneEditor';
import ExternalLayoutEditor from '../SceneEditor/ExternalLayoutEditor';
import ProjectManager from '../ProjectManager';
import LoaderModal from '../UI/LoaderModal';
import EditorBar from '../UI/EditorBar';
import defaultTheme from '../UI/Theme/DefaultTheme';
import { Tabs, Tab } from '../UI/Tabs';
import {
  getEditorTabsInitialState,
  openEditorTab,
  closeEditorTab,
  changeCurrentTab,
  getEditors,
  getCurrentTabIndex,
  getCurrentTab,
  closeProjectTabs,
} from './EditorTabsHandler';
import { watchPromiseInState } from '../Utils/WatchPromiseInState';
import { timeFunction } from '../Utils/TimeFunction';
import FileOpener from '../Utils/FileOpener';
import FileWriter from '../Utils/FileWriter';

import fixtureGame from '../fixtures/platformer/platformer.json';
const gd = global.gd;

class MainFrame extends Component {
  constructor() {
    super();
    this.state = {
      createDialogOpen: false,
      exportDialogOpen: false,
      loadingProject: false,
      previewLoading: false,
      currentProject: null,
      projectManagerOpen: false,
      editorTabs: getEditorTabsInitialState(),
    };
    this.toolbar = null;
  }

  componentWillMount() {
    if (!this.props.singleEditor) this.openStartPage();
  }

  loadFullProject = (serializedProject, cb) => {
    this.setState(
      {
        loadingProject: true,
      },
      () => {
        timeFunction(
          () => {
            const { currentProject } = this.state;
            if (currentProject) currentProject.delete();

            const newProject = gd.ProjectHelper.createNewGDJSProject();
            newProject.unserializeFrom(serializedProject);

            this.setState(
              {
                currentProject: newProject,
                loadingProject: false,
              },
              cb
            );
          },
          time => console.info(`Unserialization took ${time} ms`)
        );
      }
    );
  };

  getSerializedElements = () => {
    const editorTab = getCurrentTab(this.state.editorTabs);
    if (!editorTab || !editorTab.editorRef) {
      console.warn('No active editor or reference to the editor');
      return {};
    }

    return editorTab.editorRef.getSerializedElements();
  };

  loadBuiltinGame = () => {
    this.setState(
      {
        loadingProject: true,
      },
      () => {
        let unserializedProject = null;
        timeFunction(
          () => unserializedProject = gd.Serializer.fromJSObject(fixtureGame),
          time => console.info(`gd.Serializer.fromJSObject took ${time}ms`)
        );

        return this.loadFullProject(unserializedProject, () => {
          unserializedProject.delete();
        });
      }
    );
  };

  toggleProjectManager = () => {
    if (!this.refs.toolbar)
      this.setState({
        projectManagerOpen: !this.state.projectManagerOpen,
      });
  };

  setEditorToolbar = editorToolbar => {
    if (!this.toolbar) return;

    this.toolbar.setEditorToolbar(editorToolbar);
  };

  openExternalEvents = name => {
    this.setState({
      editorTabs: openEditorTab(
        this.state.editorTabs,
        name,
        () => (
          <EventsSheetContainer
            project={this.state.currentProject}
            events={this.state.currentProject
              .getExternalEvents(name)
              .getEvents()}
            layout={this.state.currentProject.getLayoutAt(0)}
            setToolbar={this.setEditorToolbar}
          />
        ),
        'external events ' + name
      ),
    });
  };

  openLayout = name => {
    this.setState({
      editorTabs: openEditorTab(
        this.state.editorTabs,
        name,
        () => (
          <SceneEditor
            project={this.state.currentProject}
            layoutName={name}
            setToolbar={this.setEditorToolbar}
            onPreview={(project, layout) =>
              watchPromiseInState(this, 'previewLoading', () =>
                this.props.onLayoutPreview(project, layout)).catch(() => {
                /*TODO: Error*/
              })}
            showPreviewButton
            onEditObject={this.props.onEditObject}
          />
        ),
        'layout ' + name
      ),
    });
  };

  openExternalLayout = name => {
    this.setState({
      editorTabs: openEditorTab(
        this.state.editorTabs,
        name,
        () => (
          <ExternalLayoutEditor
            project={this.state.currentProject}
            externalLayoutName={name}
            setToolbar={this.setEditorToolbar}
            onPreview={(project, layout, externalLayout) =>
              watchPromiseInState(this, 'previewLoading', () =>
                this.props.onExternalLayoutPreview(
                  project,
                  layout,
                  externalLayout
                )).catch(() => {
                /*TODO: Error*/
              })}
            showPreviewButton
            onEditObject={this.props.onEditObject}
          />
        ),
        'external layout ' + name
      ),
    });
  };

  openStartPage = () => {
    this.setState({
      editorTabs: openEditorTab(
        this.state.editorTabs,
        'Start Page',
        () => (
          <StartPage
            setToolbar={this.setEditorToolbar}
            onOpen={this._onOpenFromFile}
            onCreate={() => this._openCreateDialog()}
          />
        ),
        'start page'
      ),
    });
  };

  _openCreateDialog = (open = true) => {
    this.setState({
      createDialogOpen: open,
    });
  };

  _openFromFile = filepath => {
    FileOpener.readProjectJSONFile(filepath, (err, projectObject) => {
      if (err) {
        //TODO: Error displayed to user with a generic component
        console.error('Unable to read project', err);
        return;
      }

      this.setState(
        {
          loadingProject: true,
          editorTabs: closeProjectTabs(
            this.state.editorTabs,
            this.state.currentProject
          ),
        },
        () =>
          setTimeout(() => {
            const serializedObject = gd.Serializer.fromJSObject(projectObject);

            this.loadFullProject(serializedObject, () => {
              serializedObject.delete();

              this.state.currentProject.setProjectFile(filepath);
              this.setState({
                loadingProject: false,
                projectManagerOpen: true,
              });
            });
          }),
        10 // Let some time for the loader to be shown
      );
    });
  };

  _onOpenFromFile = () => {
    FileOpener.chooseProjectFile((err, filepath) => {
      if (!filepath || err) return;

      this._openFromFile(filepath);
    });
  };

  _onSaveToFile = () => {
    const filepath = this.state.currentProject.getProjectFile();
    if (!filepath) {
      console.warn('Unimplemented Saveas'); // TODO
      return;
    }

    FileWriter.writeProjectJSONFile(
      this.state.currentProject,
      filepath,
      err => {
        if (err) {
          //TODO: Error displayed to user with a generic component
          console.error('Unable to write project', err);
          return;
        }
      }
    );
  };

  _onCloseProject = () => {
    if (!this.state.currentProject) return;

    this.confirmCloseDialog.show(closeProject => {
      if (!closeProject || !this.state.currentProject) return;

      this.setState(
        {
          projectManagerOpen: false,
          editorTabs: closeProjectTabs(
            this.state.editorTabs,
            this.state.currentProject
          ),
        },
        () => {
          this.state.currentProject.delete();
          this.setState({
            currentProject: null,
          });
        }
      );
    });
  };

  _openExportDialog = (open = true) => {
    this.setState({
      exportDialogOpen: open,
    });
  };

  _onChangeEditorTab = value => {
    this.setState({
      editorTabs: changeCurrentTab(this.state.editorTabs, value),
    });
  };

  _onEditorTabActive = editorTab => {
    if (!editorTab.editorRef) return;
    editorTab.editorRef.updateToolbar();
  };

  _onCloseEditorTab = editorTab => {
    this.setState({
      editorTabs: closeEditorTab(this.state.editorTabs, editorTab),
    });
  };

  render() {
    const {
      currentProject,
    } = this.state;
    const { exportDialog, createDialog } = this.props;
    const showLoader = this.state.loadingProject ||
      this.state.previewLoading ||
      this.props.loading;

    return (
      <MuiThemeProvider muiTheme={defaultTheme}>
        <div className="main-frame">
          <ProjectTitlebar project={this.state.currentProject} />
          <Drawer open={this.state.projectManagerOpen}>
            <EditorBar
              title={currentProject ? currentProject.getName() : 'No project'}
              showMenuIconButton={false}
              iconElementRight={
                <IconButton onClick={this.toggleProjectManager}>
                  <NavigationClose />
                </IconButton>
              }
            />
            {currentProject &&
              <ProjectManager
                project={currentProject}
                onOpenExternalEvents={this.openExternalEvents}
                onOpenLayout={this.openLayout}
                onOpenExternalLayout={this.openExternalLayout}
                onSaveProject={this._onSaveToFile}
                onCloseProject={this._onCloseProject}
                onExportProject={this._openExportDialog}
              />}
          </Drawer>
          <Toolbar
            ref={toolbar => this.toolbar = toolbar}
            showProjectIcons={!this.props.singleEditor}
            hasProject={!!this.state.currentProject}
            toggleProjectManager={this.toggleProjectManager}
            openProject={this._onOpenFromFile}
            loadBuiltinGame={this.loadBuiltinGame}
            requestUpdate={this.props.requestUpdate}
          />
          <Tabs
            value={getCurrentTabIndex(this.state.editorTabs)}
            onChange={this._onChangeEditorTab}
            hideLabels={!!this.props.singleEditor}
          >
            {getEditors(this.state.editorTabs).map((editorTab, id) => (
              <Tab
                label={editorTab.name}
                value={id}
                key={editorTab.key}
                onActive={() => this._onEditorTabActive(editorTab)}
                onClose={() => this._onCloseEditorTab(editorTab)}
              >
                <div style={{ display: 'flex', flex: 1, height: '100%' }}>
                  {editorTab.render()}
                </div>
              </Tab>
            ))}
          </Tabs>
          <LoaderModal show={showLoader} />
          <ConfirmCloseDialog
            ref={confirmCloseDialog =>
              this.confirmCloseDialog = confirmCloseDialog}
          />
          {!!exportDialog &&
            React.cloneElement(exportDialog, {
              open: this.state.exportDialogOpen,
              onClose: () => this._openExportDialog(false),
              project: this.state.currentProject,
            })}
          {!!createDialog &&
            React.cloneElement(createDialog, {
              open: this.state.createDialogOpen,
              onClose: () => this._openCreateDialog(false),
              onOpen: filepath => {
                this._openCreateDialog(false);
                this._openFromFile(filepath);
              },
            })}
        </div>
      </MuiThemeProvider>
    );
  }
}

export default MainFrame;
