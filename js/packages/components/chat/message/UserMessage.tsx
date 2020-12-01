import React from 'react'
import { View, ScrollView } from 'react-native'
import { SHA3 } from 'sha3'
import palette from 'google-palette'
import Color from 'color'
import { Text } from '@ui-kitten/components'

import beapi from '@berty-tech/api'
import { useInteraction, useLastConvInteraction } from '@berty-tech/store/hooks'
import { useStyles } from '@berty-tech/styles'

import { MemberAvatar } from '../../avatars'
import { HyperlinkUserMessage, TimestampStatusUserMessage } from './UserMessageComponents'
import { pbDateToNum } from '../../helpers'
import AttachmentImage from '@berty-tech/components/AttachmentImage'
import { InteractionUserMessage } from '@berty-tech/store/types.gen'

const pal = palette('tol-rainbow', 256)

const useStylesMessage = () => {
	const [{ row, text, width }] = useStyles()
	return {
		isMeMessage: [row.item.bottom, { maxWidth: '90%' }],
		isOtherMessage: [row.item.top, { maxWidth: '90%' }],
		circleAvatarUserMessage: [row.item.bottom, width(40)],
		messageItem: [],
		personNameInGroup: text.size.tiny,
	}
}

const interactionsFilter = (inte: any) =>
	inte.type === beapi.messenger.AppMessage.Type.TypeUserMessage && inte.isMe

const getUserMessageState = (
	inte: any,
	members: { [key: string]: any } | undefined,
	convKind: any,
	previousMessage: any,
	nextMessage: any,
	border: any,
	color: any,
) => {
	const sentDate = pbDateToNum(inte?.sentDate)

	let name = ''
	let baseColor = color.blue
	let isFollowupMessage: boolean | undefined = false
	let isFollowedMessage: boolean | undefined = false
	let isWithinCollapseDuration: number | boolean | null | undefined = false
	let msgTextColor, msgBackgroundColor, msgBorderColor, msgSenderColor

	const cmd = null /*messenger.message.isCommandMessage(payload.body)*/
	if (convKind === beapi.messenger.Conversation.Type.ContactType) {
		// State of OneToOne conversation
		msgTextColor = inte.isMe
			? inte.acknowledged
				? color.white
				: cmd
				? color.grey
				: color.blue
			: color.blue
		msgBackgroundColor = inte.isMe ? (inte.acknowledged ? color.blue : color.white) : '#CED2FF99'
		msgBorderColor = inte.isMe && (cmd ? border.color.grey : border.color.blue)

		isWithinCollapseDuration =
			nextMessage &&
			inte?.isMe === nextMessage?.isMe &&
			sentDate &&
			nextMessage.sentDate &&
			(parseInt(nextMessage?.sentDate.toString(), 10) || 0) - (sentDate || 0) < 60000 // one minute
	} else {
		// State for MultiMember conversation
		if (inte.memberPublicKey && members && members[inte.memberPublicKey]) {
			name = members[inte.memberPublicKey].displayName
		}
		isFollowupMessage =
			previousMessage && !inte.isMe && inte.memberPublicKey === previousMessage.memberPublicKey
		isFollowedMessage =
			nextMessage && !inte.isMe && inte.memberPublicKey === nextMessage.memberPublicKey

		isWithinCollapseDuration =
			nextMessage &&
			inte?.memberPublicKey === nextMessage?.memberPublicKey &&
			sentDate &&
			nextMessage.sentDate &&
			(parseInt(nextMessage?.sentDate.toString(), 10) || 0) - (sentDate || 0) < 60000 // one minute

		if (!inte.isMe && inte.memberPublicKey) {
			const h = new SHA3(256).update(inte.memberPublicKey).digest()
			baseColor = '#' + pal[h[0]]
		}
		msgTextColor = inte.isMe
			? inte.acknowledged
				? color.white
				: cmd
				? color.grey
				: baseColor
			: baseColor
		msgBackgroundColor = inte.isMe
			? inte.acknowledged
				? baseColor
				: color.white
			: Color(baseColor).alpha(0.1).string()
		msgBorderColor = inte.isMe && (cmd ? border.color.grey : { borderColor: baseColor })
		msgSenderColor = inte.isMe ? 'red' : baseColor
	}

	return {
		name,
		isFollowupMessage,
		isFollowedMessage,
		isWithinCollapseDuration,
		msgTextColor,
		msgBackgroundColor,
		msgBorderColor,
		msgSenderColor,
		cmd,
	}
}

export const UserMessage: React.FC<{
	inte: InteractionUserMessage
	members?: { [key: string]: any }
	convPK: string
	convKind: any
	previousMessageId: string
	nextMessageId: string
}> = ({ inte, members, convPK, convKind, previousMessageId, nextMessageId }) => {
	const previousMessage = useInteraction(previousMessageId, convPK)
	const nextMessage = useInteraction(nextMessageId, convPK)
	const lastInte = useLastConvInteraction(convPK, interactionsFilter)

	const _styles = useStylesMessage()
	const [{ row, margin, padding, column, text, border, color }, { scaleSize }] = useStyles()

	const isGroup = convKind === beapi.messenger.Conversation.Type.MultiMemberType

	const {
		name,
		isFollowupMessage,
		isFollowedMessage,
		isWithinCollapseDuration,
		msgTextColor,
		msgBackgroundColor,
		msgBorderColor,
		msgSenderColor,
		cmd,
	} = getUserMessageState(inte, members, convKind, previousMessage, nextMessage, border, color)

	return (
		<View
			style={[
				row.left,
				inte.isMe ? _styles.isMeMessage : _styles.isOtherMessage,
				padding.horizontal.medium,
				padding.top.scale(2),
			]}
		>
			{!inte.isMe && isGroup && !isFollowedMessage && (
				<View
					style={{
						paddingRight: 5 * scaleSize,
						paddingBottom: 5 * scaleSize,
						justifyContent: 'center',
						alignItems: 'center',
						alignSelf: 'flex-end',
					}}
				>
					<MemberAvatar
						publicKey={inte.memberPublicKey}
						conversationPublicKey={inte.conversationPublicKey}
						size={30 * scaleSize}
					/>
				</View>
			)}

			<View style={[column.top, _styles.messageItem]}>
				{(inte.medias?.length || 0) > 0 && (
					<View
						style={{
							justifyContent: inte.isMe ? 'flex-end' : 'flex-start',
							flexWrap: inte.isMe ? 'wrap-reverse' : 'wrap',
							flexDirection: 'row',
							marginBottom: 10,
							...(inte.isMe
								? { borderRightColor: 'blue', borderRightWidth: 1, borderTopRightRadius: 15 }
								: { borderLeftColor: 'blue', borderLeftWidth: 1, borderTopLeftRadius: 15 }),
						}}
					>
						{inte.medias?.map((media) => {
							if (media.mimeType?.startsWith('image') && media.cid) {
								return (
									<AttachmentImage
										style={{ height: 100, width: 100, margin: 5, resizeMode: 'contain' }}
										cid={media.cid}
									/>
								)
							}
							return (
								<ScrollView style={{ height: 100, width: 100 }}>
									<Text>{JSON.stringify(media, null, 4)}</Text>
								</ScrollView>
							)
						})}
					</View>
				)}
				{!inte.isMe && isGroup && !isFollowupMessage && (
					<View style={[isFollowedMessage && margin.left.scale(40)]}>
						<Text style={[text.bold.medium, _styles.personNameInGroup, { color: msgSenderColor }]}>
							{name}
						</Text>
					</View>
				)}
				{inte.payload.body ? (
					<HyperlinkUserMessage
						inte={inte}
						msgBorderColor={msgBorderColor}
						isFollowedMessage={isFollowedMessage}
						msgBackgroundColor={msgBackgroundColor}
						msgTextColor={msgTextColor}
					/>
				) : (
					(inte.medias?.length || 0) === 0 && (
						<Text style={{ textAlign: 'right', color: 'grey' }}>-</Text>
					)
				)}
				{!isWithinCollapseDuration && (
					<TimestampStatusUserMessage
						inte={inte}
						lastInte={lastInte}
						isFollowedMessage={isFollowedMessage}
						cmd={cmd}
					/>
				)}
			</View>
		</View>
	)
}
