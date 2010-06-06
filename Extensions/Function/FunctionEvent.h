/**

Game Develop - Function Extension
Copyright (c) 2008-2010 Florian Rival (Florian.Rival@gmail.com)

This software is provided 'as-is', without any express or implied
warranty. In no event will the authors be held liable for any damages
arising from the use of this software.

Permission is granted to anyone to use this software for any purpose,
including commercial applications, and to alter it and redistribute it
freely, subject to the following restrictions:

    1. The origin of this software must not be misrepresented; you must not
    claim that you wrote the original software. If you use this software
    in a product, an acknowledgment in the product documentation would be
    appreciated but is not required.

    2. Altered source versions must be plainly marked as such, and must not be
    misrepresented as being the original software.

    3. This notice may not be removed or altered from any source
    distribution.

*/

#ifndef FUNCTIONEVENT_H
#define FUNCTIONEVENT_H

#include <boost/shared_ptr.hpp>
#include "GDL/Event.h"
class RuntimeScene;
class ObjectsConcerned;
class Instruction;
class Evaluateur;
class TiXmlElement;

#if defined(GDE)
class Scene;
class MainEditorCommand;
class wxWindow;
#endif

/**
 * Function event is an event which is executed by an action ( This action can pass to the function parameters and objects concerned )
 * Functions are referenced in a (static) std::map so as to let action call them.
 */
class FunctionEvent : public BaseEvent
{
    public:
        FunctionEvent();
        FunctionEvent(const FunctionEvent & event);
        virtual ~FunctionEvent();

        FunctionEvent& operator=(const FunctionEvent & event);
        virtual BaseEventSPtr Clone() { return boost::shared_ptr<BaseEvent>(new FunctionEvent(*this));}

        virtual bool IsExecutable() const {return true;}
        virtual void Execute( RuntimeScene & scene, ObjectsConcerned & objectsConcerned ) {}; //Execute does not do anything, as function are launched by actions

        virtual void Preprocess(const Game & game, RuntimeScene & scene, std::vector < BaseEventSPtr > & eventList, unsigned int indexOfTheEventInThisList);
        virtual void Launch( RuntimeScene & scene, ObjectsConcerned & objectsConcerned, std::vector < string > parameters_ );

        static std::map < const Scene* , std::map < std::string, FunctionEvent* > > functionsList; ///< Static map containing all functions, associated with their game, scene and name
        static std::map < const Scene* , std::vector < std::string >* > currentFunctionParameter; ///< Static map containing the parameters of the current function
        void UnreferenceFunction();
        void ReferenceFunction(Scene *);

        virtual bool CanHaveSubEvents() const {return true;}
        virtual const vector < BaseEventSPtr > & GetSubEvents() const {return events;};
        virtual vector < BaseEventSPtr > & GetSubEvents() {return events;};
        void SetSubEvents(vector < BaseEventSPtr > & subEvents_) {events = subEvents_;};

        const vector < Instruction > & GetConditions() const { return conditions; };
        vector < Instruction > & GetConditions() { return conditions; };
        void SetConditions(vector < Instruction > & conditions_) { conditions = conditions_; };

        const vector < Instruction > & GetActions() const { return actions; };
        vector < Instruction > & GetActions() { return actions; };
        void SetActions(vector < Instruction > & actions_) { actions = actions_; };

        string GetName() const { return name; };
        string GetName() { return name; };
        void SetName(string name_) { name = name_; };

        virtual vector < vector<Instruction>* > GetAllConditionsVectors();
        virtual vector < vector<Instruction>* > GetAllActionsVectors();

        virtual void SaveToXml(TiXmlElement * eventElem) const;
        virtual void LoadFromXml(const TiXmlElement * eventElem);

#if defined(GDE)
        /**
         * Called when user click on the event
         */
        virtual void OnSingleClick(int x, int y, vector < boost::tuple< vector < BaseEventSPtr > *, unsigned int, vector < Instruction > *, unsigned int > > & eventsSelected,
                                 bool & conditionsSelected, bool & instructionsSelected);

        /**
         * Called when the user want to edit the event
         */
        virtual void EditEvent(wxWindow* parent_, Game & game_, Scene & scene_, MainEditorCommand & mainEditorCommand_);
#endif

    private:
        void Init(const FunctionEvent & event);
        bool ExecuteConditions( RuntimeScene & scene, ObjectsConcerned & objectsConcerned );
        void ExecuteActions( RuntimeScene & scene, ObjectsConcerned & objectsConcerned );

        string name;
        vector < Instruction > conditions;
        vector < Instruction > actions;
        vector < BaseEventSPtr > events;

#ifdef GDE
        virtual void RenderInBitmap() const;
        bool nameSelected;
#endif
};

#endif // FUNCTIONEVENT_H