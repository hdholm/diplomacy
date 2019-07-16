// ==============================================================================
// Copyright (C) 2019 - Philip Paquette, Steven Bocco
//
//  This program is free software: you can redistribute it and/or modify it under
//  the terms of the GNU Affero General Public License as published by the Free
//  Software Foundation, either version 3 of the License, or (at your option) any
//  later version.
//
//  This program is distributed in the hope that it will be useful, but WITHOUT
//  ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS
//  FOR A PARTICULAR PURPOSE.  See the GNU Affero General Public License for more
//  details.
//
//  You should have received a copy of the GNU Affero General Public License along
//  with this program.  If not, see <https://www.gnu.org/licenses/>.
// ==============================================================================
import React from "react";
import {Tabs} from "../../core/tabs";
import {Table} from "../../core/table";
import {FindForm} from "../forms/find_form";
import {CreateForm} from "../forms/create_form";
import {InlineGameView} from "../utils/inline_game_view";
import {STRINGS} from "../../../diplomacy/utils/strings";
import {Helmet} from "react-helmet";
import {Navigation} from "../widgets/navigation";
import {PageContext} from "../widgets/page_context";
import {ContentGame} from "./content_game";
import PropTypes from 'prop-types';
import {Tab} from "../../core/tab";

const TABLE_LOCAL_GAMES = {
    game_id: ['Game ID', 0],
    deadline: ['Deadline', 1],
    rights: ['Rights', 2],
    rules: ['Rules', 3],
    players: ['Players/Expected', 4],
    status: ['Status', 5],
    phase: ['Phase', 6],
    join: ['Join', 7],
    actions: ['Actions', 8],
};

export class ContentGames extends React.Component {

    constructor(props) {
        super(props);
        this.state = {tab: null};
        this.changeTab = this.changeTab.bind(this);
        this.onFind = this.onFind.bind(this);
        this.onCreate = this.onCreate.bind(this);
        this.wrapGameData = this.wrapGameData.bind(this);
    }

    getPage() {
        return this.context;
    }

    onFind(form) {
        for (let field of ['game_id', 'status', 'include_protected', 'for_omniscience'])
            if (!form[field])
                form[field] = null;
        this.getPage().channel.listGames(form)
            .then((data) => {
                this.getPage().success('Found ' + data.length + ' data.');
                this.getPage().addGamesFound(data);
                this.getPage().loadGames();
            })
            .catch((error) => {
                this.getPage().error('Error when looking for distant games: ' + error);
            });
    }

    onCreate(form) {
        for (let key of Object.keys(form)) {
            if (form[key] === '')
                form[key] = null;
        }
        if (form.n_controls !== null)
            form.n_controls = parseInt(form.n_controls, 10);
        if (form.deadline !== null)
            form.deadline = parseInt(form.deadline, 10);
        form.rules = ['POWER_CHOICE'];
        for (let rule of STRINGS.PUBLIC_RULES) {
            const rule_id = `rule_${rule.toLowerCase()}`;
            if (form.hasOwnProperty(rule_id)) {
                if (form[rule_id])
                    form.rules.push(rule);
                delete form[rule_id];
            }
        }
        let networkGame = null;
        this.getPage().channel.createGame(form)
            .then((game) => {
                this.getPage().addToMyGames(game.local);
                networkGame = game;
                return networkGame.getAllPossibleOrders();
            })
            .then(allPossibleOrders => {
                networkGame.local.setPossibleOrders(allPossibleOrders);
                this.getPage().load(
                    `game: ${networkGame.local.game_id}`,
                    <ContentGame data={networkGame.local}/>,
                    {success: 'Game created.'}
                );
            })
            .catch((error) => {
                this.getPage().error('Error when creating a game: ' + error);
            });
    }

    changeTab(tabIndex) {
        this.setState({tab: tabIndex});
    }

    wrapGameData(gameData) {
        return new InlineGameView(this.getPage(), gameData);
    }

    render() {
        const title = 'Games';
        const page = this.getPage();
        const navigation = [
            ['load a game from disk', page.loadGameFromDisk],
            ['logout', page.logout]
        ];
        const myGames = this.props.myGames;
        const gamesFound = this.props.gamesFound;
        myGames.sort((a, b) => b.timestamp_created - a.timestamp_created);
        gamesFound.sort((a, b) => b.timestamp_created - a.timestamp_created);
        const tab = this.state.tab ? this.state.tab : (myGames.length ? 'my-games' : 'find');
        return (
            <main>
                <Helmet>
                    <title>{title} | Diplomacy</title>
                </Helmet>
                <Navigation title={title} username={page.channel.username} navigation={navigation}/>
                <Tabs menu={['create', 'find', 'my-games']} titles={['Create', 'Find', 'My Games']}
                      onChange={this.changeTab} active={tab}>
                    {tab === 'create' ? (
                        <Tab id="tab-games-create" display={true}>
                            <CreateForm onSubmit={this.onCreate}/>
                        </Tab>
                    ) : ''}
                    {tab === 'find' ? (
                        <Tab id="tab-games-find" display={true}>
                            <FindForm onSubmit={this.onFind}/>
                            <Table className={"table table-striped"} caption={"Games"} columns={TABLE_LOCAL_GAMES}
                                   data={gamesFound} wrapper={this.wrapGameData}/>
                        </Tab>
                    ) : ''}
                    {tab === 'my-games' ? (
                        <Tab id={'tab-my-games'} display={true}>
                            <Table className={"table table-striped"} caption={"My games"} columns={TABLE_LOCAL_GAMES}
                                   data={myGames} wrapper={this.wrapGameData}/>
                        </Tab>
                    ) : ''}
                </Tabs>
            </main>
        );
    }

    componentDidMount() {
        window.scrollTo(0, 0);
    }
}

ContentGames.contextType = PageContext;
ContentGames.propTypes = {
    gamesFound: PropTypes.array.isRequired,
    myGames: PropTypes.array.isRequired
};
