import Comment from '../models/comment.js';
import Post from '../models/post.js';
import { validationResult } from 'express-validator';

export const createComment = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { content, parentComment } = req.body;
    const postId = req.params.postId;

    const post = await Post.findById(postId);
    if (!post || !post.isPublished) {
      return res.status(404).json({
        message: 'Post not found or not published',
      });
    }

    let parentCommentDoc = null;
    if (parentComment) {
      parentCommentDoc = await Comment.findById(parentComment);
      if (!parentCommentDoc || parentCommentDoc.post.toString() !== postId) {
        return res.status(400).json({
          message: 'Invalid parent comment reference',
        });
      }
    }

    const comment = new Comment({
      content,
      author: req.user._id,
      post: postId,
      parentComment: parentCommentDoc ? parentCommentDoc._id : null,
    });

    await comment.save();
    await comment.populate('author', 'username profilePicture');

    res.status(201).json({
      message: 'Comment added successfully',
      comment: {
        ...comment.toObject(),
        replies: [],
      },
    });
  } catch (error) {
    console.error('Create comment error:', error);
    res.status(500).json({
      message: 'Failed to create comment',
    });
  }
};

export const updateComment = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { content } = req.body;
    const comment = await Comment.findById(req.params.commentId);

    if (!comment) {
      return res.status(404).json({
        message: 'Comment not found',
      });
    }

    if (comment.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        message: 'You can only edit your own comments',
      });
    }

    comment.content = content;
    await comment.save();
    await comment.populate('author', 'username profilePicture');

    res.json({
      message: 'Comment updated successfully',
      comment,
    });
  } catch (error) {
    console.error('Update comment error:', error);
    res.status(500).json({
      message: 'Failed to update comment',
    });
  }
};

export const deleteComment = async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.commentId);

    if (!comment) {
      return res.status(404).json({
        message: 'Comment not found',
      });
    }

    const isAuthor = comment.author.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isAuthor && !isAdmin) {
      return res.status(403).json({
        message: 'Not authorized to delete this comment',
      });
    }

    await Comment.deleteOne({ _id: comment._id });
    await Comment.deleteMany({ parentComment: comment._id });

    res.json({
      message: 'Comment deleted successfully',
    });
  } catch (error) {
    console.error('Delete comment error:', error);
    res.status(500).json({
      message: 'Failed to delete comment',
    });
  }
};

export const likeComment = async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.commentId);

    if (!comment) {
      return res.status(404).json({
        message: 'Comment not found',
      });
    }

    const hasLiked = comment.likes.includes(req.user._id);

    if (hasLiked) {
      comment.likes.pull(req.user._id);
      await comment.save();

      return res.json({
        message: 'Comment unliked successfully',
        liked: false,
        likes: comment.likes.length,
      });
    }

    comment.likes.push(req.user._id);
    await comment.save();

    res.json({
      message: 'Comment liked successfully',
      liked: true,
      likes: comment.likes.length,
    });
  } catch (error) {
    console.error('Like comment error:', error);
    res.status(500).json({
      message: 'Failed to like comment',
    });
  }
};

export const getPostComments = async (req, res) => {
  try {
    const comments = await Comment.find({
      post: req.params.postId,
      isApproved: true,
    })
      .populate('author', 'username profilePicture')
      .sort({ createdAt: 1 })
      .lean();

    const commentMap = new Map();
    comments.forEach((comment) => {
      const normalized = {
        ...comment,
        _id: comment._id.toString(),
        parentComment: comment.parentComment ? comment.parentComment.toString() : null,
        likes: (comment.likes || []).map((id) => id.toString()),
        replies: [],
      };
      commentMap.set(normalized._id, normalized);
    });

    const rootComments = [];
    commentMap.forEach((comment) => {
      if (comment.parentComment && commentMap.has(comment.parentComment)) {
        commentMap.get(comment.parentComment).replies.unshift(comment);
      } else {
        rootComments.unshift(comment);
      }
    });

    res.json({
      comments: rootComments,
      pagination: {
        totalComments: comments.length,
      },
    });
  } catch (error) {
    console.error('Get comments error:', error);
    res.status(500).json({
      message: 'Failed to fetch comments',
    });
  }
};

